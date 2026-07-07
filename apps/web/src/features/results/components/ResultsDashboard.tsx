'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Percent,
  Search,
  Filter,
  Copy,
  Download,
  Check,
  RefreshCw,
  EyeIcon,
} from 'lucide-react';
import { LeadCrm, ImportResult } from '@groweasy/shared';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge, getCrmStatusBadgeVariant, formatCrmStatus } from '../../../components/ui/StatusBadge';
import { cn } from '../../../lib/utils';

interface ExpandableCellProps {
  value: string;
  maxLength?: number;
}

export function ExpandableCell({ value, maxLength = 50 }: ExpandableCellProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (value.length <= maxLength) {
    return <span>{value}</span>;
  }
  
  return (
    <span 
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className="cursor-pointer hover:text-primary transition-colors duration-150 select-text break-words"
      title="Click to expand/collapse"
    >
      {isExpanded ? value : `${value.substring(0, maxLength - 3)}...`}
    </span>
  );
}

interface ResultsDashboardProps {
  result: ImportResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<'imported' | 'skipped'>('imported');
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('');
  const [copiedCellId, setCopiedCellId] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({
    created_at: true,
    name: true,
    email: true,
    mobile_without_country_code: true,
    company: true,
    crm_status: true,
    data_source: true,
    crm_note: true,
  });

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCellId(id);
    setTimeout(() => setCopiedCellId(null), 2000);
  };

  // Convert and trigger CSV download
  const exportToCSV = () => {
    const records = result.importedRecords;
    if (records.length === 0) return;

    const headers = Object.keys(records[0]) as (keyof LeadCrm)[];
    const csvRows = [
      headers.join(','), // Header row
      ...records.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName];
            // Format string: escape double quotes, wrap in quotes if spaces/commas exist
            const valStr = val === undefined || val === null ? '' : String(val);
            const escaped = valStr.replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
              ? `"${escaped}"`
              : escaped;
          })
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_leads_import_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger JSON download
  const exportToJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `crm_leads_import_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic filter function for the custom global/status/source search
  const customFilterFn = (row: any, columnId: string, filterValue: string) => {
    const value = row.getValue(columnId);
    return value ? String(value).toLowerCase().includes(filterValue.toLowerCase()) : false;
  };

  // Define Columns for the Imported Leads Table
  const columnHelper = createColumnHelper<LeadCrm>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Created At</span>,
        cell: (info) => {
          const date = new Date(info.getValue());
          return (
            <span className="text-xs text-on-surface/60 font-mono">
              {isNaN(date.getTime())
                ? info.getValue()
                : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          );
        },
      }),
      columnHelper.accessor('name', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Name</span>,
        cell: (info) => <span className="font-bold text-sm text-on-background">{info.getValue()}</span>,
      }),
      columnHelper.accessor('email', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Email</span>,
        cell: (info) => {
          const email = info.getValue();
          const cellId = `email-${info.row.id}`;
          return email ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-on-background/80 font-medium truncate max-w-[140px]">{email}</span>
              <button
                onClick={() => handleCopy(email, cellId)}
                className="p-1 rounded hover:bg-on-background/5 text-on-surface/40 hover:text-primary transition-colors cursor-pointer"
                title="Copy Email"
              >
                {copiedCellId === cellId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <span className="text-on-surface/30 italic text-xs">No email</span>
          );
        },
      }),
      columnHelper.accessor('mobile_without_country_code', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Phone</span>,
        cell: (info) => {
          const phone = info.getValue();
          const row = info.row.original;
          const fullPhone = phone ? `${row.country_code} ${phone}` : '';
          const cellId = `phone-${info.row.id}`;
          return phone ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-on-surface/60 font-mono">{fullPhone}</span>
              <button
                onClick={() => handleCopy(fullPhone, cellId)}
                className="p-1 rounded hover:bg-on-background/5 text-on-surface/40 hover:text-primary transition-colors cursor-pointer"
                title="Copy Phone"
              >
                {copiedCellId === cellId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <span className="text-on-surface/30 italic text-xs">No phone</span>
          );
        },
      }),
      columnHelper.accessor('company', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Company</span>,
        cell: (info) => <span className="text-sm font-medium text-on-background/70">{info.getValue() || 'N/A'}</span>,
      }),
      columnHelper.accessor('crm_status', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">CRM Status</span>,
        cell: (info) => {
          const status = info.getValue();
          return <StatusBadge variant={getCrmStatusBadgeVariant(status)}>{formatCrmStatus(status)}</StatusBadge>;
        },
      }),
      columnHelper.accessor('data_source', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Data Source</span>,
        cell: (info) => {
          const src = info.getValue();
          return src ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase border border-primary/10">
              {src.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="text-on-surface/30 italic text-xs">Unspecified</span>
          );
        },
      }),
      columnHelper.accessor('crm_note', {
        header: () => <span className="font-bold text-xs uppercase tracking-wider text-on-surface/60">Notes</span>,
        cell: (info) => {
          const notes = info.getValue();
          const cleanNotes = notes ? notes.replace(/\\n/g, ' ') : '';
          if (!cleanNotes) return <span className="text-on-surface/30 italic text-xs">—</span>;
          return (
            <div className="text-xs text-on-surface/50 max-w-[200px]">
              <ExpandableCell value={cleanNotes} maxLength={30} />
            </div>
          );
        },
      }),
    ],
    [copiedCellId]
  );

  // TanStack Table Instance for Imported Leads
  const table = useReactTable({
    data: result.importedRecords,
    columns,
    state: {
      globalFilter,
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-background">Lead Import Dashboard</h2>
          <p className="text-xs text-on-surface/60 mt-1">
            Browse normalized leads, review skipped records, and export files.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outlined" onClick={onReset} className="flex items-center space-x-2 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            <span>Import Another</span>
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="tonal"
              onClick={exportToCSV}
              disabled={result.importedRecords.length === 0}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </Button>
            <Button
              variant="filled"
              onClick={exportToJSON}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>JSON</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: CheckCircle,
            label: 'Imported Leads',
            val: result.metrics.importedCount,
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            desc: 'Successfully mapped to CRM',
          },
          {
            icon: AlertTriangle,
            label: 'Skipped Leads',
            val: result.metrics.skippedCount,
            color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            desc: 'Failed contact constraints',
          },
          {
            icon: Percent,
            label: 'Success Rate',
            val: `${result.metrics.successRate}%`,
            color: 'bg-primary/10 text-primary',
            desc: 'Valid leads percentage',
          },
          {
            icon: Clock,
            label: 'Execution Time',
            val: `${(result.metrics.processingTimeMs / 1000).toFixed(2)}s`,
            color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            desc: 'AI parsing & batch runtime',
          },
        ].map((metric, i) => (
          <Card key={i} variant="elevated" padding="md" className="border-border/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center space-x-4">
              <div className={cn('p-3 rounded-2xl flex-shrink-0', metric.color)}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-on-surface/50 font-bold uppercase tracking-wider leading-none">
                  {metric.label}
                </p>
                <p className="text-xl font-bold mt-1.5 leading-none text-on-background">
                  {metric.val}
                </p>
                <p className="text-[11px] text-on-surface/40 mt-1 leading-none">
                  {metric.desc}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border/40 space-x-6">
        <button
          onClick={() => setActiveTab('imported')}
          className={cn(
            'pb-3 font-semibold text-sm border-b-2 transition-all relative cursor-pointer',
            activeTab === 'imported'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface/60 hover:text-on-background'
          )}
        >
          Imported Leads ({result.importedRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('skipped')}
          className={cn(
            'pb-3 font-semibold text-sm border-b-2 transition-all relative cursor-pointer',
            activeTab === 'skipped'
              ? 'border-error text-error font-bold'
              : 'border-transparent text-on-surface/60 hover:text-on-background'
          )}
        >
          Skipped Records ({result.skippedRecords.length})
        </button>
      </div>

      {/* Dashboard Viewport */}
      {activeTab === 'imported' ? (
        <Card variant="outlined" padding="none" className="border-border/60 overflow-hidden bg-surface">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-on-surface/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leads by name, email, or company..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-full text-sm bg-background text-on-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-on-surface/40 font-medium"
              />
            </div>

            {/* Column Visibility and Filtering Controls */}
            <div className="flex items-center space-x-3 self-end md:self-auto">
              <div className="flex items-center space-x-1.5 text-xs text-on-surface/50 font-bold bg-background/50 border border-border/60 px-3 py-1.5 rounded-full">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setGlobalFilter(e.target.value); // simple hook-in for query matching
                  }}
                  className="bg-transparent text-on-background font-semibold hover:text-primary outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="GOOD_LEAD_FOLLOW_UP">Good Lead Follow Up</option>
                  <option value="DID_NOT_CONNECT">Did Not Connect</option>
                  <option value="BAD_LEAD">Bad Lead</option>
                  <option value="SALE_DONE">Sale Done</option>
                </select>
              </div>

              {/* Column toggle dropdown */}
              <div className="relative group">
                <Button variant="outlined" size="sm" className="h-8 text-xs flex items-center space-x-1.5 select-none bg-background cursor-pointer">
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Columns</span>
                </Button>
                <div className="absolute right-0 top-9 w-48 bg-surface border border-border shadow-elevation2 rounded-xl p-2 hidden group-hover:block hover:block z-20">
                  <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-wider px-2 py-1">Toggle Fields</p>
                  {table.getAllLeafColumns().map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-background rounded-lg text-xs font-semibold text-on-background cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded text-primary border-border focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{column.id.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Table Layout */}
          <div className="overflow-x-auto w-full max-h-[440px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-background sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'px-6 py-3 font-semibold text-xs leading-none select-none',
                          header.column.getCanSort() ? 'cursor-pointer hover:bg-on-background/5 transition-colors' : ''
                        )}
                      >
                        <div className="flex items-center space-x-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <span className="text-[10px] text-primary">▲</span>,
                            desc: <span className="text-[10px] text-primary">▼</span>,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getAllLeafColumns().length} className="text-center py-12 text-on-surface/40 font-medium">
                      No matching imported leads found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border/40 hover:bg-on-background/5 transition-colors',
                        idx % 2 === 0 ? 'bg-surface' : 'bg-background/20'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-3.5 text-sm text-on-background/80 font-medium max-w-[220px] truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Banner */}
          <div className="px-6 py-4 border-t border-border/40 bg-surface flex items-center justify-between text-xs font-semibold text-on-surface/60">
            <div className="flex items-center space-x-1">
              <span>Page</span>
              <span className="text-on-background font-bold">{table.getState().pagination.pageIndex + 1}</span>
              <span>of</span>
              <span className="text-on-background font-bold">{table.getPageCount() || 1}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outlined"
                size="sm"
                className="h-8 px-3 rounded-lg"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                size="sm"
                className="h-8 px-3 rounded-lg"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Skipped Records Panel */
        <Card variant="outlined" padding="none" className="border-border/60 overflow-hidden bg-surface">
          <div className="px-6 py-4 border-b border-border/40 bg-surface">
            <h3 className="font-bold text-base text-on-background">Excluded Rows Audit</h3>
            <p className="text-xs text-on-surface/60 mt-0.5">
              These {result.skippedRecords.length} records were skipped because they violated constraints (missing both email and phone numbers).
            </p>
          </div>

          <div className="overflow-x-auto w-full max-h-[440px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-border bg-background sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface/60 uppercase">Row</th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface/60 uppercase">Skipped Reason</th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface/60 uppercase">Raw Record Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {result.skippedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-on-surface/40 font-medium">
                      Zero records were excluded. Clean sheet!
                    </td>
                  </tr>
                ) : (
                  result.skippedRecords.map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        'border-b border-border/40 hover:bg-on-background/5 transition-colors',
                        idx % 2 === 0 ? 'bg-surface' : 'bg-background/20'
                      )}
                    >
                      <td className="px-6 py-4 text-xs font-mono font-bold text-on-surface/50">{item.rowIndex}</td>
                      <td className="px-6 py-4 text-sm text-error font-semibold flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4 text-error" />
                        <span>{item.reason}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-on-surface/75 max-w-lg break-words">
                        <ExpandableCell value={JSON.stringify(item.rawRecord)} maxLength={60} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
