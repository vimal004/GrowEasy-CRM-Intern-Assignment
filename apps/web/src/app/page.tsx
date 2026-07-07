'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressStepper } from '../components/ui/ProgressStepper';
import { UploadDropzone } from '../features/upload/components/UploadDropzone';
import { PreviewTable } from '../features/preview/components/PreviewTable';
import { UploadProgress } from '../features/processing/components/UploadProgress';
import { ResultsDashboard } from '../features/results/components/ResultsDashboard';
import { parseCsvPreview } from '../services/mockApi';
import { CSVMetadata, ImportResult } from '@groweasy/shared';

const WIZARD_STEPS = [
  { label: 'Upload CSV', description: 'Select a lead sheet file' },
  { label: 'Preview CSV', description: 'Review structure and mappings' },
  { label: 'AI Processing', description: 'Normalize and validate' },
  { label: 'CRM Results', description: 'Browse and export results' },
];

export default function LeadImporterPage() {
  const [activeStage, setActiveStage] = React.useState<number>(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [metadata, setMetadata] = React.useState<CSVMetadata | null>(null);
  const [previewRows, setPreviewRows] = React.useState<any[]>([]);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState<boolean>(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  // Reset wizard back to stage 0
  const handleReset = () => {
    setFile(null);
    setMetadata(null);
    setPreviewRows([]);
    setImportResult(null);
    setPreviewError(null);
    setActiveStage(0);
  };

  // Called when file is accepted in Dropzone
  const handleFileAccepted = async (acceptedFile: File) => {
    setFile(acceptedFile);
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const { metadata: meta, previewRows: rows } = await parseCsvPreview(acceptedFile);
      setMetadata(meta);
      setPreviewRows(rows);
      setActiveStage(1); // Advance to preview page
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to parse CSV preview.');
      setFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Called when user confirms CSV mapping in Preview page
  const handleConfirmMapping = () => {
    setActiveStage(2); // Move to AI Processing page
  };

  // Called when AI Processing is finished
  const handleImportComplete = (result: ImportResult) => {
    setImportResult(result);
    setActiveStage(3); // Move to final Results page
  };

  // Stage transition variants for Framer Motion
  const stageVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: [0, 0, 0.2, 1] }, // Decelerate curve
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
      transition: { duration: 0.25, ease: [0.3, 0, 1, 1] }, // Accelerate curve
    }),
  };

  return (
    <div className="space-y-12">
      {/* Top Progress Stepper */}
      <ProgressStepper steps={WIZARD_STEPS} currentStep={activeStage} />

      {/* Main stage content with exit/enter transitions */}
      <div className="relative min-h-[480px] w-full flex flex-col justify-start">
        {isLoadingPreview && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-30 rounded-3xl">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-sm font-bold text-on-background">Parsing sheet layout...</p>
            </div>
          </div>
        )}

        {previewError && (
          <div className="bg-error/10 border border-error/20 text-error text-sm font-semibold rounded-2xl p-4 flex items-center space-x-2 mb-6">
            <span>{previewError}</span>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeStage}
            custom={activeStage}
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full flex flex-col justify-start"
          >
            {activeStage === 0 && (
              <UploadDropzone onFileAccepted={handleFileAccepted} />
            )}

            {activeStage === 1 && metadata && (
              <PreviewTable
                metadata={metadata}
                previewRows={previewRows}
                onConfirm={handleConfirmMapping}
                onCancel={handleReset}
              />
            )}

            {activeStage === 2 && file && (
              <UploadProgress
                file={file}
                onComplete={handleImportComplete}
                onCancel={handleReset}
              />
            )}

            {activeStage === 3 && importResult && (
              <ResultsDashboard result={importResult} onReset={handleReset} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
