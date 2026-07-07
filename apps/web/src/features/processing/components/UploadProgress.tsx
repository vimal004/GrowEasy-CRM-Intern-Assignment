'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { simulateImport, ProcessingUpdate } from '../../../services/api';
import { ImportResult } from '@groweasy/shared';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface UploadProgressProps {
  file: File;
  onComplete: (result: ImportResult) => void;
  onCancel: () => void;
}

export function UploadProgress({ file, onComplete, onCancel }: UploadProgressProps) {
  const [update, setUpdate] = React.useState<ProcessingUpdate>({
    stage: 'Initializing import...',
    progress: 0,
    processedCount: 0,
    estimatedRemainingSeconds: 5,
  });
  const [logs, setLogs] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  const startImportSimulation = React.useCallback(() => {
    setError(null);
    setLogs([]);
    simulateImport(file, (newUpdate) => {
      setUpdate(newUpdate);
      if (newUpdate.log) {
        setLogs((prev) => [...prev, newUpdate.log!]);
      }
      if (newUpdate.progress === 100 && newUpdate.result) {
        // Delay slightly for dramatic effect, then move to results page
        setTimeout(() => {
          onComplete(newUpdate.result!);
        }, 800);
      }
    }).catch((err) => {
      setError(err.message || 'An error occurred during AI processing.');
    });
  }, [file, onComplete]);

  React.useEffect(() => {
    startImportSimulation();
  }, [startImportSimulation]);

  // Scroll logs to bottom
  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (error) {
    return (
      <Card variant="elevated" className="max-w-md mx-auto border-error/20 py-8 shadow-elevation2">
        <CardContent className="flex flex-col items-center justify-center space-y-6 text-center">
          <div className="p-4 rounded-full bg-error/10 text-error">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-on-background">AI Processing Failed</h3>
            <p className="text-sm text-on-surface/60 max-w-sm">
              {error}
            </p>
          </div>
          <div className="flex space-x-3 w-full">
            <Button variant="outlined" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="filled" className="flex-1 flex items-center justify-center space-x-2" onClick={startImportSimulation}>
              <RefreshCw className="w-4 h-4" />
              <span>Retry Import</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Processing Animation Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-on-background">AI CSV Import Wizard</h2>
        <p className="text-sm text-on-surface/60">
          Please wait while the model extracts leads and normalizes contacts...
        </p>
      </div>

      {/* Progress Card */}
      <Card variant="elevated" padding="lg" className="shadow-elevation2 border-primary/10">
        <CardContent className="space-y-6 pt-2">
          {/* Progress Circular/Percentage Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <span className="font-bold text-sm text-on-background truncate">
                {update.stage}
              </span>
            </div>
            <span className="font-bold text-2xl text-primary font-mono leading-none">
              {update.progress}%
            </span>
          </div>

          {/* Progress Bar Wrapper */}
          <div className="w-full h-3 bg-primary-container/20 rounded-full overflow-hidden relative border border-border/10">
            <motion.div
              className="absolute top-0 bottom-0 left-0 bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${update.progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-on-surface/50">Rows Processed</span>
              <p className="text-base font-bold text-on-background font-mono leading-none">
                {update.processedCount} leads
              </p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-on-surface/50">Remaining Time</span>
              <p className="text-base font-bold text-on-background font-mono leading-none">
                ~ {update.estimatedRemainingSeconds}s
              </p>
            </div>
          </div>

          {/* Log Window */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-on-surface/60">
              <Terminal className="w-4 h-4" />
              <span>Real-Time Logs</span>
            </div>
            <div
              ref={logContainerRef}
              className="h-[160px] bg-neutral-900 dark:bg-black/80 rounded-xl p-4 font-mono text-[11px] text-zinc-300 overflow-y-auto space-y-1 border border-border/10 shadow-inner select-text scroll-smooth"
            >
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap">
                  <span className="text-emerald-500 font-bold">$ </span>
                  {log}
                </div>
              ))}
              {update.progress < 100 && (
                <div className="flex items-center space-x-1.5 text-zinc-500 italic mt-1.5 animate-pulse">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500 animate-ping" />
                  <span>Awaiting next batch pipeline...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
