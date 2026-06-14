/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileJson, 
  FileSpreadsheet, 
  Database,
  Calculator,
  ArrowUpDown
} from 'lucide-react';
import { DatabaseState, QueryResult, RowData } from '../types';

interface QueryEditorTabProps {
  dbState: DatabaseState;
  onExecuteQuery: (sql: string) => QueryResult;
  initialQuery?: string;
}

export default function QueryEditorTab({
  dbState,
  onExecuteQuery,
  initialQuery = 'SELECT * FROM artists LIMIT 10;',
}: QueryEditorTabProps) {
  const [sqlQuery, setSqlQuery] = useState(initialQuery);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Custom sorting state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setSqlQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleRunQuery = () => {
    const res = onExecuteQuery(sqlQuery);
    setResult(res);
    setCurrentPage(1); // Reset page index
    setSortCol(null);  // Reset grid sorting
  };

  const handleFormatSQL = () => {
    let clean = sqlQuery;
    const keywords = [
      'select', 'insert', 'update', 'delete', 'create table', 'drop table', 'alter table',
      'from', 'where', 'join', 'left join', 'inner join', 'on', 'group by', 'order by', 'limit', 'offset', 'values', 'and', 'or', 'null', 'as'
    ];
    
    // Quick regex to format keywords to upper case
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      clean = clean.replace(regex, keyword.toUpperCase());
    });
    setSqlQuery(clean);
  };

  const handleInjectTemplate = (type: string) => {
    if (type === 'basic') {
      setSqlQuery(`-- 1. Standard search selector of table tracks\nSELECT id, name, milliseconds, unit_price\nFROM tracks\nWHERE unit_price >= 0.99\nORDER BY milliseconds DESC\nLIMIT 5;`);
    } else if (type === 'join') {
      setSqlQuery(`-- 2. Multi-table Join: Artists matching Albums and tracks\nSELECT artists.name AS artist_name, albums.title AS album_title, tracks.name AS track_name\nFROM tracks\nLEFT JOIN albums ON tracks.album_id = albums.id\nLEFT JOIN artists ON albums.artist_id = artists.id\nLIMIT 5;`);
    } else if (type === 'aggregate') {
      setSqlQuery(`-- 3. Groups, aggregates, and calculates averages of genres\nSELECT genres.name AS genre, COUNT(tracks.id) AS track_count, AVG(tracks.milliseconds) / 1000.0 AS avg_duration_seconds\nFROM tracks\nJOIN genres ON tracks.genre_id = genres.id\nGROUP BY genres.name\nORDER BY track_count DESC;`);
    } else if (type === 'insert') {
      setSqlQuery(`-- 4. Safe entry insertion demonstrating ForeignKey checks\nINSERT INTO albums (id, title, artist_id)\nVALUES (107, 'Paranoid', 4);\n\nSELECT * FROM albums ORDER BY id DESC;`);
    }
  };

  // Filter and sort results
  let processedRows = result?.rows ? [...result.rows] : [];
  
  if (searchFilter.trim() && result?.columns) {
    const query = searchFilter.toLowerCase();
    processedRows = processedRows.filter(row => {
      return result.columns.some(col => String(row[col] || '').toLowerCase().includes(query));
    });
  }

  if (sortCol) {
    processedRows.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDesc ? valB - valA : valA - valB;
      }
      return sortDesc 
        ? String(valB).localeCompare(String(valA)) 
        : String(valA).localeCompare(String(valB));
    });
  }

  // Slice pagination bounds
  const totalRows = processedRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = processedRows.slice(startIdx, startIdx + pageSize);

  const handleHeaderSort = (column: string) => {
    if (sortCol === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(column);
      setSortDesc(false);
    }
  };

  // Export files generators
  const downloadFile = (content: string, type: string, suffix: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_export_${Date.now()}.${suffix}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!result || result.rows.length === 0) return;
    const headers = result.columns.join(',');
    const rows = result.rows.map(row => {
      return result.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',');
    }).join('\n');

    downloadFile(`${headers}\n${rows}`, 'text/csv', 'csv');
  };

  const exportJSON = () => {
    if (!result || result.rows.length === 0) return;
    downloadFile(JSON.stringify(result.rows, null, 2), 'application/json', 'json');
  };

  const exportSQLDump = () => {
    if (!result || result.rows.length === 0) return;
    const statements = result.rows.map(row => {
      const keys = result.columns.join(', ');
      const values = result.columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return val;
      }).join(', ');
      return `INSERT INTO query_export (${keys}) VALUES (${values});`;
    }).join('\n');
    
    downloadFile(statements, 'text/plain', 'sql');
  };

  return (
    <div id="query-editor-panel" className="flex-1 flex flex-col h-full bg-slate-950 p-4 overflow-hidden gap-4">
      
      {/* Editor Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold font-mono text-slate-100">SQL Worksheet Query Workspace</h2>
        </div>
        
        {/* Templates selector button menu */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px] font-mono">
            <button 
              onClick={() => handleInjectTemplate('basic')}
              className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded cursor-pointer"
            >
              Basic Select
            </button>
            <button 
              onClick={() => handleInjectTemplate('join')}
              className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded cursor-pointer border-l border-slate-800"
            >
              Complex JOIN
            </button>
            <button 
              onClick={() => handleInjectTemplate('aggregate')}
              className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded cursor-pointer border-l border-slate-800"
            >
              Aggregations
            </button>
            <button 
              onClick={() => handleInjectTemplate('insert')}
              className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded cursor-pointer border-l border-slate-800"
            >
              Inserts Keys
            </button>
          </div>

          <button 
            onClick={handleFormatSQL}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded text-[10px] font-mono cursor-pointer transition-colors"
            title="Convert keywords to UPPERCASE"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format Keywords</span>
          </button>
          
          <button 
            onClick={handleRunQuery}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold px-4 py-1.5 rounded border border-emerald-500/35 text-[11px] font-mono cursor-pointer shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
            title="Execute current worksheet SQL commands"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN QUERY</span>
          </button>
        </div>
      </div>

      {/* Code Editor TextArea and Line Numbers container */}
      <div className="h-44 border border-slate-850 bg-slate-950/40 rounded flex overflow-hidden">
        {/* Mock line numbers */}
        <div className="w-10 bg-slate-900 border-r border-slate-855 flex flex-col items-center py-2 text-[10px] font-mono text-slate-600 select-none text-right pr-2">
          {Array.from({ length: Math.min(30, sqlQuery.split('\n').length + 1) }).map((_, i) => (
            <div key={i} className="leading-5 h-5">{i + 1}</div>
          ))}
        </div>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="-- Write relational ANSI queries here...\nSELECT * FROM tracks WHERE unit_price > 0.99 LIMIT 10;"
          className="flex-1 bg-transparent text-slate-100 p-2 font-mono text-[11.5px] leading-5 focus:outline-none resize-none overflow-y-auto outline-none selection:bg-slate-800 focus:ring-0"
          spellCheck={false}
        />
      </div>

      {/* Status Execution Ribbon */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-850 px-3.5 py-2.5 rounded select-none">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-slate-500" />
          <span>Status:</span>
          {result ? (
            result.success ? (
              <span className="text-emerald-400 font-bold">● Query OK</span>
            ) : (
              <span className="text-rose-400 font-bold">● Execution Error</span>
            )
          ) : (
            <span className="text-slate-500">Worksheet Idle</span>
          )}
        </div>

        {result && (
          <div className="flex items-center gap-4">
            {result.success && <span>Rows: <strong className="text-slate-200">{result.rows.length}</strong></span>}
            <span>Time: <strong className="text-slate-200">{result.executionTimeMs} ms</strong></span>
          </div>
        )}
      </div>

      {/* Query Output Result Section */}
      <div className="flex-1 flex flex-col bg-slate-925 border border-slate-900 rounded p-3 min-h-0">
        
        {result?.success === false ? (
          <div className="flex-1 bg-rose-950/15 border border-rose-950/60 p-4 rounded text-xs font-mono text-rose-350 overflow-y-auto select-text leading-relaxed">
            <h4 className="font-bold text-rose-400 mb-2">Virtual Sandbox Compilation Error:</h4>
            <p>{result.message}</p>
          </div>
        ) : result && result.rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none text-slate-600 gap-2 border border-dashed border-slate-850 rounded">
            <Database className="w-8 h-8 text-slate-700" />
            <h4 className="text-xs font-mono text-slate-450 font-semibold">Row records empty</h4>
            <p className="text-[10px] font-mono text-slate-550 max-w-sm">
              {result.message || 'Statement completed successfully yielding 0 records.'}
            </p>
          </div>
        ) : result && result.columns.length > 0 ? (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            
            {/* Table Export Controls / filtration row */}
            <div className="flex flex-wrap items-center justify-between gap-3.5 select-none pt-0.5 pb-1 border-b border-slate-900">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input 
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="In-memory row filter..."
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none w-full font-mono outline-none"
                />
              </div>

              {/* Offline export widgets */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-slate-500 mr-1.5">Export:</span>
                <button 
                  onClick={exportCSV}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                  title="Download values as CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                  <span>CSV</span>
                </button>
                <button 
                  onClick={exportJSON}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                  title="Download records as JSON payload"
                >
                  <FileJson className="w-3 h-3 text-cyan-400" />
                  <span>JSON</span>
                </button>
                <button 
                  onClick={exportSQLDump}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                  title="Generate SQL INSERT commands file"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span>Inserts SQL</span>
                </button>
              </div>
            </div>

            {/* Main Interactive Spreadsheet Canvas */}
            <div className="flex-1 overflow-auto border border-slate-900 rounded bg-slate-950 scrollbar-thin scrollbar-thumb-slate-800">
              <table className="w-full text-left border-collapse font-mono text-[11px] select-text">
                <thead className="bg-slate-900/85 sticky top-0 border-b border-slate-850 select-none z-10">
                  <tr>
                    {result.columns.map((column) => (
                      <th 
                        key={column} 
                        onClick={() => handleHeaderSort(column)}
                        className="p-2 text-[10px] font-semibold text-slate-400 cursor-pointer hover:bg-slate-800 hover:text-slate-100 transition-colors border-r border-slate-850"
                      >
                        <div className="flex items-center gap-1">
                          <span className="truncate">{column}</span>
                          <ArrowUpDown className={`w-3 h-3 shrink-0 ${sortCol === column ? 'text-emerald-400' : 'text-slate-650'}`} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/80">
                  {pageRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-850/30 font-medium">
                      {result.columns.map((column) => {
                        const val = row[column];
                        let renderedVal = String(val === null || val === undefined ? 'NULL' : val);
                        let isNull = val === null || val === undefined;
                        let isDigital = typeof val === 'number';

                        return (
                          <td 
                            key={column} 
                            className={`p-2 border-r border-slate-850/35 overflow-hidden text-ellipsis max-w-[200px] whitespace-nowrap ${
                              isNull ? 'text-rose-450/60 italic font-light' : isDigital ? 'text-cyan-400 text-right' : 'text-slate-250'
                            }`}
                          >
                            {renderedVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls bar */}
            <div className="flex flex-wrap items-center justify-between select-none text-[10px] font-mono pr-1 pt-1.5 border-t border-slate-905">
              <div className="flex items-center gap-3 text-slate-550">
                <span>
                  Showing <strong className="text-slate-350">{totalRows === 0 ? 0 : startIdx + 1}</strong> to <strong className="text-slate-350">{Math.min(totalRows, startIdx + pageSize)}</strong> of <strong className="text-emerald-400">{totalRows}</strong> records filtered
                </span>
                <select 
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded cursor-pointer focus:outline-none text-[10px]"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-400">
                  Page <strong className="text-slate-100">{currentPage}</strong> / {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none text-slate-600 gap-2 border border-dashed border-slate-850 rounded">
            <Calculator className="w-10 h-10 text-slate-750" />
            <h4 className="text-xs font-mono text-slate-400 font-semibold">Ready for compilation</h4>
            <p className="text-[10px] font-mono text-slate-550 max-w-sm leading-relaxed">
              Input queries inside the editor box at the top and click "RUN QUERY" to evaluate SQL queries. Results, indexes, and execution velocities print here.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
