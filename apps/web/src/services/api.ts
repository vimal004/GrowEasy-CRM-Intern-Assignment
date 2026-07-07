import { CSVMetadata, ImportResult } from '@groweasy/shared';

const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In local dev, use the local IPv4 port
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.')
    ) {
      return 'http://127.0.0.1:8080';
    }
    // In production on Render, point directly to the deployed backend service
    return 'https://groweasy-crm-api.onrender.com';
  }
  return 'http://127.0.0.1:8080';
};

const BACKEND_URL = getBackendUrl();

/**
 * Frontend fetch timeout in milliseconds.
 * Set slightly above the backend's own 28-second guard so the backend always
 * gets a chance to return a proper 504 before the client aborts.
 */
const FETCH_TIMEOUT_MS = 35_000;

export interface ProcessingUpdate {
  stage: string;
  progress: number;
  processedCount: number;
  estimatedRemainingSeconds: number;
  log?: string;
  result?: ImportResult;
}

/**
 * Sends the CSV file to the real backend preview endpoint.
 */
export async function parseCsvPreview(file: File): Promise<{ metadata: CSVMetadata; previewRows: any[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate CSV preview.');
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Preview request timed out. The server took too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends the CSV file to the real backend import endpoint and reports status updates.
 *
 * Progress tracking uses a Zeno's-paradox (exponential decay) approach:
 * each interval tick closes 15% of the remaining gap to 75%, so the bar
 * moves quickly at first then slows asymptotically — it never "gets stuck"
 * but also never dishonestly reaches 75% before the backend responds.
 *
 * For fast imports (backend responds before the first tick), the animation
 * is skipped entirely and the bar jumps straight from 10% → 90% → 100%.
 *
 * A 35-second AbortController timeout is applied so the UI shows a clear
 * "Request timed out" error rather than hanging indefinitely.
 */
export async function simulateImport(
  file: File,
  onUpdate: (update: ProcessingUpdate) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const ts = (label: string) =>
    `[${new Date().toLocaleTimeString()}] ${label}`;

  const pushUpdate = (
    stage: string,
    progress: number,
    log: string,
    extra: Partial<ProcessingUpdate> = {}
  ) => {
    onUpdate({
      stage,
      progress,
      processedCount: 0,
      estimatedRemainingSeconds: Math.max(0, Math.ceil((100 - progress) * 0.15)),
      log: ts(log),
      ...extra,
    });
  };

  const controller = new AbortController();
  const fetchTimer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    pushUpdate('Uploading lead sheet...', 10, 'Uploading CSV file to API server...');

    // Start backend request in parallel
    const apiPromise = fetch(`${BACKEND_URL}/api/import`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    // ─── Zeno's progress bar ──────────────────────────────────────────────────
    // Asymptotically approaches 75%; never gets stuck, never overshoots.
    // Each tick closes 15% of the remaining gap: progress += (75 - progress) * 0.15
    let currentProgress = 10;
    const startedAt = Date.now();
    const MAX_FAKE_PROGRESS = 75;
    const TICK_INTERVAL_MS = 800;
    const MAX_FAKE_DURATION_MS = 29_000; // stop ticking a second before fetch timeout

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= MAX_FAKE_DURATION_MS) {
        clearInterval(interval);
        return;
      }

      // Zeno decay: close 15% of remaining gap per tick
      currentProgress = currentProgress + (MAX_FAKE_PROGRESS - currentProgress) * 0.15;
      // Clamp to avoid floating-point overshoot
      currentProgress = Math.min(currentProgress, MAX_FAKE_PROGRESS);

      const roundedProgress = Math.round(currentProgress);
      const stage =
        roundedProgress < 40
          ? 'Parsing CSV and pre-mapping fields...'
          : roundedProgress < 60
          ? 'Extracting and de-duplicating leads (AI)...'
          : 'Validating CRM target constraints...';
      const log =
        roundedProgress < 40
          ? 'Deterministic header mapping in progress...'
          : roundedProgress < 60
          ? 'AI pipeline active. Processing record batches...'
          : 'Validating CRM schemas & sanitizing inputs...';

      onUpdate({
        stage,
        progress: roundedProgress,
        processedCount: 0,
        estimatedRemainingSeconds: Math.max(0, Math.ceil((100 - roundedProgress) * 0.1)),
        log: ts(log),
      });
    }, TICK_INTERVAL_MS);

    let response: Response;
    try {
      response = await apiPromise;
    } catch (fetchErr: any) {
      clearInterval(interval);
      if (fetchErr.name === 'AbortError') {
        throw new Error(
          'The import request timed out after 35 seconds. ' +
          'Try splitting the CSV into smaller files and re-uploading.'
        );
      }
      throw fetchErr;
    }

    clearInterval(interval);
    clearTimeout(fetchTimer);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'AI import pipeline failed.');
    }

    const result: ImportResult = await response.json();

    // Smooth finalization: jump from wherever the Zeno bar stopped → 90% → 100%
    pushUpdate(
      'Compiling CRM import metrics...',
      90,
      `Received results. Imported: ${result.metrics.importedCount}, Skipped: ${result.metrics.skippedCount}`
    );
    await new Promise((r) => setTimeout(r, 350));

    pushUpdate(
      'Import completed successfully!',
      100,
      `Done. Processing Time: ${result.metrics.processingTimeMs}ms`
    );

    onUpdate({
      stage: 'Import completed successfully!',
      progress: 100,
      processedCount: result.importedRecords.length + result.skippedRecords.length,
      estimatedRemainingSeconds: 0,
      log: ts('CRM data import finalized.'),
      result,
    });

    return result;
  } catch (err: any) {
    clearTimeout(fetchTimer);
    onUpdate({
      stage: 'Import failed',
      progress: 0,
      processedCount: 0,
      estimatedRemainingSeconds: 0,
      log: ts(`ERROR: ${err.message}`),
    });
    throw err;
  }
}
