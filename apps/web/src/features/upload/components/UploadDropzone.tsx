'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Sparkles, Brain, Filter, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';

interface UploadDropzoneProps {
  onFileAccepted: (file: File) => void;
}

export function UploadDropzone({ onFileAccepted }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setError(null);
    
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv') {
      setError('Please upload a valid CSV file (.csv)');
      return;
    }

    // Check size (limit to 5MB for preview)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds the 5MB limit.');
      return;
    }

    onFileAccepted(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onButtonClick();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-on-background"
        >
          Import Leads in Seconds
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="text-lg text-on-surface/60 max-w-xl mx-auto"
        >
          Upload your raw CSV lead sheets. Our AI will normalize, parse, and deduplicate details automatically to match your GrowEasy CRM schema.
        </motion.p>
      </div>

      {/* Upload Box Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      >
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Upload CSV Lead File"
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-emphasized cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-4 select-none ${
            isDragActive
              ? 'border-primary bg-primary-container/10 scale-[1.01] shadow-elevation1'
              : 'border-border hover:border-primary/50 hover:bg-on-background/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-2xl transition-colors duration-200 ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-primary-container/40 text-primary'}`}>
              <UploadCloud className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-bold text-on-background">
                Drag and drop your lead sheet here
              </p>
              <p className="text-sm text-on-surface/60">
                or click to browse your computer
              </p>
            </div>

            <div className="text-xs text-on-surface/40 pt-2 font-medium">
              Supported format: .csv (up to 5MB)
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-error text-sm font-semibold bg-error/10 px-4 py-2 rounded-full border border-error/20"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: Brain,
            title: 'AI Auto-Repair & Retry',
            desc: (
              <>
                Handles API rate-limits via <strong className="text-on-background font-bold">exponential backoff</strong> and automatically <strong className="text-on-background font-bold">repairs corrupted JSON</strong> structures.
              </>
            ),
          },
          {
            icon: Filter,
            title: 'Streaming CSV Parser',
            desc: (
              <>
                Processes massive datasets using memory-safe <strong className="text-on-background font-bold">Node.js streams</strong>, keeping a zero-memory-bloat footprint on the server.
              </>
            ),
          },
          {
            icon: Sparkles,
            title: 'Data Scrubbing & Notes',
            desc: (
              <>
                Normalizes contact records while compiling all secondary numbers, emails, and unmapped metadata into consolidated <strong className="text-on-background font-bold">crm_note</strong> fields.
              </>
            ),
          },
          {
            icon: ShieldCheck,
            title: 'Virtualized Results Grid',
            desc: (
              <>
                Renders thousands of leads instantly with <strong className="text-on-background font-bold">sticky headers</strong>, column toggles, quick search filters, and raw row-level exclusions.
              </>
            ),
          },
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
          >
            <Card variant="outlined" padding="sm" className="h-full border-border/60 hover:bg-on-background/5 hover:border-primary/30 transition-all duration-300">
              <CardContent className="space-y-3 pt-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <feat.icon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-on-background">{feat.title}</h4>
                <p className="text-xs text-on-surface/60 leading-relaxed">{feat.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
