'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { FileSpreadsheet, HardDrive, Calendar, Database, Sparkles, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../../components/ui/Card';
interface ExpandableCellProps {
  value: string;
  maxLength?: number;
}

function ExpandableCell({ value, maxLength = 50 }: ExpandableCellProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (value.length <= maxLength) {
    return <span className="select-text break-words">{value}</span>;
  }
  
  return (
    <div className="flex flex-col">
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="cursor-pointer hover:text-primary transition-colors duration-150 select-text"
        title="Click to expand/collapse"
      >
        {isExpanded ? (
          <div className="max-h-24 overflow-y-auto break-words whitespace-pre-wrap select-text pr-1 border-l-2 border-primary/40 pl-2 py-0.5 mt-0.5 text-xs text-on-surface/80">
            {value}
          </div>
        ) : (
          <span className="truncate block max-w-full">
            {value.substring(0, maxLength - 3)}...
          </span>
        )}
      </div>
    </div>
  );
}

interface CSVMetadata {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  uploadTime: string;
  headers: string[];
}

interface PreviewTableProps {
  metadata: CSVMetadata;
  previewRows: any[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreviewTable({ metadata, previewRows, onConfirm, onCancel }: PreviewTableProps) {
  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format dates
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Dynamically build columns based on headers in preview
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<any>();
    return metadata.headers.map((header) =>
      columnHelper.accessor((row) => row[header], {
        id: header,
        header: () => (
          <span className="text-xs font-bold text-on-surface/70 tracking-wider uppercase select-none">
            {header}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue();
          if (value === undefined || value === null || value === '') {
            return <span className="text-on-surface/20 italic">null</span>;
          }
          const strValue = String(value);
          return <ExpandableCell value={strValue} maxLength={50} />;
        },
      })
    );
  }, [metadata.headers]);

  const table = useReactTable({
    data: previewRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* File Details Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileSpreadsheet, label: 'Filename', val: metadata.fileName },
          { icon: HardDrive, label: 'File Size', val: formatBytes(metadata.fileSize) },
          { icon: Database, label: 'Dimensions', val: `${metadata.rowCount} rows × ${metadata.columnCount} columns` },
          { icon: Calendar, label: 'Uploaded At', val: formatDate(metadata.uploadTime) },
        ].map((meta, i) => (
          <Card key={i} variant="filled" padding="sm" className="bg-primary-container/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-surface text-primary">
                <meta.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-on-surface/50 font-bold uppercase tracking-wider leading-none">
                  {meta.label}
                </p>
                <p className="text-sm font-semibold truncate text-on-background mt-1">
                  {meta.val}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Preview Table container */}
      <Card variant="outlined" padding="none" className="border-border/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 bg-surface flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-on-background">CSV Preview</h3>
            <p className="text-xs text-on-surface/60 mt-0.5">
              Showing the first {previewRows.length} rows as a raw layout preview.
            </p>
          </div>
        </div>

        {/* Scrollable Container with sticky headers */}
        <div className="overflow-x-auto w-full max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-3 font-semibold text-xs leading-none bg-background sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={metadata.headers.length} className="text-center py-8 text-on-surface/40">
                    No preview records available.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/40 hover:bg-on-background/5 transition-colors ${
                      idx % 2 === 0 ? 'bg-surface' : 'bg-background/20'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-3.5 text-sm text-on-background/80 font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Section */}
      <Card variant="elevated" padding="md" className="border-primary/20 max-w-xl mx-auto shadow-elevation2">
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <CardTitle>AI Mapping Confirmation</CardTitle>
          </div>
          <CardDescription>
            Ready to process this lead sheet? Please review the import configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex space-x-3 p-3 rounded-xl bg-warning/5 border border-warning/20 text-warning text-xs leading-relaxed">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-on-background">CRM Schema Rules:</p>
              <ul className="list-disc pl-4 space-y-1 text-on-surface/70">
                <li>
                  Rows containing <strong>neither</strong> a valid email nor a mobile number will be automatically skipped.
                </li>
                <li>
                  We will extract the <strong>first</strong> email and mobile. Secondary contacts or unmapped columns will be stored in the <strong>CRM Notes</strong>.
                </li>
                <li>
                  Dates will be normalized to standard ISO format.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-on-surface/50 border-t border-border/40 pt-4">
            <span>Estimated AI mapping time:</span>
            <span className="font-bold text-on-background">~ {Math.max(1, Math.ceil(metadata.rowCount / 10) * 1.5).toFixed(1)} seconds</span>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border/10 mt-2 pt-4">
          <Button variant="outlined" onClick={onCancel} className="flex items-center space-x-2">
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </Button>
          <Button variant="filled" onClick={onConfirm} className="flex items-center space-x-2 font-bold px-6">
            <span>Map Leads with AI</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
