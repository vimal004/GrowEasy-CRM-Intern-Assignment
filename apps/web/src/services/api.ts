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

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to generate CSV preview.');
  }

  return response.json();
}

/**
 * Sends the CSV file to the real backend import endpoint and reports status updates.
 */
export async function simulateImport(
  file: File,
  onUpdate: (update: ProcessingUpdate) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Define steps to show in the frontend UI during backend processing
  const updateProgress = (stage: string, progress: number, log: string) => {
    onUpdate({
      stage,
      progress,
      processedCount: 0,
      estimatedRemainingSeconds: Math.ceil((100 - progress) * 0.15),
      log: `[${new Date().toLocaleTimeString()}] ${log}`,
    });
  };

  try {
    updateProgress('Uploading lead sheet...', 10, 'Uploading CSV file to API server...');
    
    // Start backend request in parallel
    const apiPromise = fetch(`${BACKEND_URL}/api/import`, {
      method: 'POST',
      body: formData,
    });

    // Animate progress up to 75% while waiting for AI response
    let currentProgress = 10;
    const interval = setInterval(() => {
      if (currentProgress < 75) {
        currentProgress += 5;
        let stage = 'Extracting and de-duplicating leads (AI)...';
        let log = `AI pipeline active. Processing record batches...`;
        if (currentProgress > 45) {
          stage = 'Validating CRM target constraints...';
          log = `Validating CRM schemas & sanitizing inputs...`;
        }
        onUpdate({
          stage,
          progress: currentProgress,
          processedCount: 0,
          estimatedRemainingSeconds: Math.ceil((100 - currentProgress) * 0.1),
          log: `[${new Date().toLocaleTimeString()}] ${log}`,
        });
      }
    }, 800);

    const response = await apiPromise;
    clearInterval(interval);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'AI import pipeline failed.');
    }

    const result: ImportResult = await response.json();

    // Fast animation for finalization steps
    updateProgress('Compiling CRM import metrics...', 90, `Received results. Imported: ${result.metrics.importedCount}, Skipped: ${result.metrics.skippedCount}`);
    await new Promise((r) => setTimeout(r, 400));

    updateProgress('Import completed successfully!', 100, `Done. Processing Time: ${result.metrics.processingTimeMs}ms`);

    onUpdate({
      stage: 'Import completed successfully!',
      progress: 100,
      processedCount: result.importedRecords.length + result.skippedRecords.length,
      estimatedRemainingSeconds: 0,
      log: `[${new Date().toLocaleTimeString()}] CRM data import finalized.`,
      result,
    });

    return result;
  } catch (err: any) {
    onUpdate({
      stage: 'Import failed',
      progress: 0,
      processedCount: 0,
      estimatedRemainingSeconds: 0,
      log: `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`,
    });
    throw err;
  }
}
