/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Database,
  Filter
} from 'lucide-react';
import { DatabaseState, TableData, RowData, ColumnDefinition } from '../types';

interface TableExplorerTabProps {
  dbState: DatabaseState;
  onModifyDbState: (updatedDb: DatabaseState) => void;
}

export default function TableExplorerTab({
  dbState,
  onModifyDbState
}: TableExplorerTabProps) {
  const tableNames = Object.keys(dbState.tables);
  const [activeTable, setActiveTable] = useState(tableNames[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  
  // Row creation state
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<RowData>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ rIdx: number; colName: string; originalVal: any; currentVal: string } | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sync state if table list shifts
  useEffect(() => {
    if (!activeTable && tableNames.length > 0) {
      setActiveTable(tableNames[0]);
    }
  }, [dbState, activeTable, tableNames]);

  // Handle table switch reset
  const handleTableChange = (tableName: string) => {
    setActiveTable(tableName);
    setSelectedRowIndices([]);
    setShowAddRowForm(false);
    setNewRowDraft({});
    setEditingCell(null);
    setValidationError(null);
    setPage(1);
  };

  const selectedTableData = dbState.tables[activeTable];
  if (!selectedTableData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-550 font-mono text-center p-6 bg-slate-950">
        <Table className="w-12 h-12 text-slate-750 mb-3" />
        <h3 className="text-sm text-slate-400 font-semibold">No schema tables defined</h3>
        <p className="text-xs text-slate-600 mt-1">Please populate schemas inside the SQL editor or load sandbox structures.</p>
      </div>
    );
  }

  const columns = selectedTableData.schema.columns;

  // Double click cell launcher
  const handleCellDoubleClick = (rIdx: number, colName: string, val: any) => {
    // Only allow editing if columns aren't marked as auto or virtual for security
    setEditingCell({
      rIdx,
      colName,
      originalVal: val,
      currentVal: val === null ? '' : String(val)
    });
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    const { rIdx, colName, currentVal } = editingCell;

    try {
      const colDef = columns.find(c => c.name === colName);
      if (!colDef) return;

      const workingDb = JSON.parse(JSON.stringify(dbState)) as DatabaseState;
      const targetTable = workingDb.tables[activeTable];
      const targetRow = targetTable.rows[rIdx];

      let parsedVal: any = currentVal.trim() === '' ? null : currentVal;
      
      // Parse numerical bounds
      if (colDef.type === 'INTEGER' && parsedVal !== null) {
        parsedVal = parseInt(parsedVal, 10);
        if (isNaN(parsedVal)) throw new Error('Input is not a valid integer.');
      }
      if (colDef.type === 'REAL' && parsedVal !== null) {
        parsedVal = parseFloat(parsedVal);
        if (isNaN(parsedVal)) throw new Error('Input is not a valid decimal.');
      }
      
      // Constraint Verification
      if (colDef.notNull && parsedVal === null) {
        throw new Error(`Column "${colName}" does not accept NULL configurations.`);
      }

      if (colDef.isPrimaryKey || colDef.isUnique) {
        const dup = targetTable.rows.some((r, idx) => idx !== rIdx && r[colName] === parsedVal);
        if (dup) throw new Error(`Integrity unique conflict: duplicate key on column "${colName}".`);
      }

      // Foreign references check
      if (colDef.foreignKey && parsedVal !== null) {
        const parent = workingDb.tables[colDef.foreignKey.table];
        if (parent) {
          const hasMatch = parent.rows.some(r => r[colDef.foreignKey!.column] === parsedVal);
          if (!hasMatch) throw new Error(`Foreign Key Conflict: Value "${parsedVal}" does not exist in parent table "${parent.name}.${colDef.foreignKey.column}".`);
        }
      }

      targetRow[colName] = parsedVal;
      onModifyDbState(workingDb);
      setEditingCell(null);
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  };

  const startAddRow = () => {
    const freshDraft: RowData = {};
    columns.forEach(col => {
      freshDraft[col.name] = col.defaultValue !== null ? String(col.defaultValue) : '';
    });
    setNewRowDraft(freshDraft);
    setValidationError(null);
    setShowAddRowForm(true);
  };

  const saveNewRowFormValue = () => {
    try {
      const workingDb = JSON.parse(JSON.stringify(dbState)) as DatabaseState;
      const targetTable = workingDb.tables[activeTable];
      const finalEntry: RowData = {};

      for (const col of columns) {
        const raw = newRowDraft[col.name];
        let val: any = raw === undefined || raw === '' ? null : raw;

        if (col.type === 'INTEGER' && val !== null) {
          val = parseInt(val, 10);
          if (isNaN(val)) throw new Error(`Column "${col.name}" requires an integer.`);
        }
        if (col.type === 'REAL' && val !== null) {
          val = parseFloat(val);
          if (isNaN(val)) throw new Error(`Column "${col.name}" requires a real decimal.`);
        }

        // Constraints
        if (col.notNull && val === null) {
          throw new Error(`Column "${col.name}" cannot be null.`);
        }

        if (col.isPrimaryKey || col.isUnique) {
          const dup = targetTable.rows.some(r => r[col.name] === val && val !== null);
          if (dup) throw new Error(`Unique constraint failed on key column "${col.name}" (Value "${val}" already exists).`);
        }

        if (col.foreignKey && val !== null) {
          const parent = workingDb.tables[col.foreignKey.table];
          if (parent) {
            const exists = parent.rows.some(r => r[col.foreignKey!.column] === val);
            if (!exists) throw new Error(`Foreign key constraint failed: Value "${val}" does not exist inside "${parent.name}.${col.foreignKey!.column}".`);
          }
        }

        finalEntry[col.name] = val;
      }

      targetTable.rows.push(finalEntry);
      onModifyDbState(workingDb);
      setShowAddRowForm(false);
      setNewRowDraft({});
      setPage(Math.ceil(targetTable.rows.length / rowsPerPage) || 1);
    } catch (err: any) {
      setValidationError(err.message);
    }
  };

  const deleteSelectedRows = () => {
    if (selectedRowIndices.length === 0) return;
    if (!confirm(`Delete ${selectedRowIndices.length} selected row(s)?`)) return;

    try {
      const workingDb = JSON.parse(JSON.stringify(dbState)) as DatabaseState;
      const targetTable = workingDb.tables[activeTable];

      // Safe bounds validation of foreign keys prior to deleting
      const childTables = Object.values(workingDb.tables).filter(t => 
        t.schema.columns.some(c => c.foreignKey?.table === activeTable)
      );

      const indicesToExclude = new Set(selectedRowIndices);
      const rowToDeleteObjects = targetTable.rows.filter((_, idx) => indicesToExclude.has(idx));

      for (const delRow of rowToDeleteObjects) {
        for (const child of childTables) {
          const relCol = child.schema.columns.find(c => c.foreignKey?.table === activeTable);
          if (relCol) {
            const parentValue = delRow[relCol.foreignKey!.column];
            if (parentValue !== undefined && parentValue !== null) {
              const matches = child.rows.some(r => r[relCol.name] === parentValue);
              if (matches) throw new Error(`Conflict: Row holds primary key matching key cells in child relational table "${child.name}" linked via foreign-key constraint.`);
            }
          }
        }
      }

      targetTable.rows = targetTable.rows.filter((_, idx) => !indicesToExclude.has(idx));
      onModifyDbState(workingDb);
      setSelectedRowIndices([]);
      setPage(1);
    } catch (e: any) {
      alert(`Deletion aborted: ${e.message}`);
    }
  };

  const handleToggleRowSelection = (idx: number) => {
    setSelectedRowIndices(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      } else {
        return [...prev, idx];
      }
    });
  };

  const handleSelectAllOnPage = (pageRowsIndices: number[]) => {
    const allSelectedOnPage = pageRowsIndices.every(idx => selectedRowIndices.includes(idx));
    if (allSelectedOnPage) {
      setSelectedRowIndices(prev => prev.filter(idx => !pageRowsIndices.includes(idx)));
    } else {
      setSelectedRowIndices(prev => {
        const unique = new Set([...prev, ...pageRowsIndices]);
        return Array.from(unique);
      });
    }
  };

  // Perform core query search filter
  let rowRecords = [...selectedTableData.rows];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    rowRecords = rowRecords.filter(r => {
      return columns.some(c => String(r[c.name] || '').toLowerCase().includes(q));
    });
  }

  // Calculate slices
  const totalRowsCount = rowRecords.length;
  const totalPagesCount = Math.ceil(totalRowsCount / rowsPerPage) || 1;
  const pageStartOffset = (page - 1) * rowsPerPage;
  const activePageRows = rowRecords.slice(pageStartOffset, pageStartOffset + rowsPerPage);
  
  // Map index tracking
  const activePageRowOriginalIndices = activePageRows.map(row => 
    selectedTableData.rows.findIndex(r => r === row)
  ).filter(idx => idx !== -1);

  return (
    <div id="table-explorer-panel" className="flex-1 flex flex-col h-full bg-slate-950 p-4 overflow-hidden gap-4">
      
      {/* Table select & search controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 select-none">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-350">Active Table:</span>
          </div>
          <select
            id="tab-explorer-selector"
            value={activeTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {tableNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <span className="text-[10px] bg-slate-900 border border-slate-850 text-slate-400 px-2.5 py-1 rounded font-mono">
            Columns: {columns.length} | Rows: {selectedTableData.rows.length}
          </span>
        </div>

        {/* Search Input & Action triggers */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 w-52">
            <Search className="w-3.5 h-3.5 text-slate-550 shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search dataset rows..."
              className="bg-transparent text-xs text-slate-200 placeholder-slate-650 focus:outline-none w-full font-mono outline-none"
            />
          </div>

          <button 
            onClick={startAddRow}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-slate-100 px-3 py-1.5 rounded text-[11px] font-mono cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert Row</span>
          </button>

          <button 
            onClick={deleteSelectedRows}
            disabled={selectedRowIndices.length === 0}
            className="flex items-center gap-1 bg-rose-650/15 hover:bg-rose-650 text-rose-450 hover:text-slate-100 border border-rose-900/30 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-rose-450 rounded px-3 py-1.5 text-[11px] font-mono cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {selectedRowIndices.length > 0 && `(${selectedRowIndices.length})`}</span>
          </button>
        </div>
      </div>

      {/* Row Insertion Modal Panel Overlay */}
      {showAddRowForm && (
        <div className="bg-slate-900 border border-slate-800 rounded p-4 text-xs font-mono space-y-3.5 animate-fadeIn select-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Add Record into Table: {activeTable}</span>
            </h4>
            <button onClick={() => setShowAddRowForm(false)} className="text-slate-500 hover:text-slate-350 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2 border border-rose-950/60 bg-rose-950/20 text-rose-350 rounded text-[11px]">
              Constraint Error: {validationError}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {columns.map((col) => (
              <div key={col.name} className="space-y-1">
                <label className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>{col.name} {col.notNull && <strong className="text-rose-500" title="Not Null">*</strong>}</span>
                  <span className="text-[9px] uppercase font-light text-slate-650">{col.type}</span>
                </label>
                <input 
                  type="text"
                  value={newRowDraft[col.name] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewRowDraft(prev => ({ ...prev, [col.name]: val }));
                  }}
                  placeholder={col.defaultValue !== null ? `Default: ${col.defaultValue}` : 'NULL'}
                  className="w-full bg-slate-950 text-slate-250 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button 
              onClick={() => setShowAddRowForm(false)}
              className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-400 px-3.5 py-1.5 rounded cursor-pointer transition"
            >
              Cancel
            </button>
            <button 
              onClick={saveNewRowFormValue}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold px-4 py-1.5 rounded cursor-pointer transition"
            >
              Add Row Object
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet grid area */}
      <div className="flex-1 overflow-auto border border-slate-900 rounded bg-slate-950 scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full text-left border-collapse font-mono text-[11px]">
          <thead className="bg-slate-900 sticky top-0 border-b border-slate-850 select-none z-10">
            <tr>
              <th className="p-2 w-10 text-center border-r border-slate-850">
                <input 
                  type="checkbox"
                  checked={activePageRowOriginalIndices.length > 0 && activePageRowOriginalIndices.every(idx => selectedRowIndices.includes(idx))}
                  onChange={() => handleSelectAllOnPage(activePageRowOriginalIndices)}
                  className="cursor-pointer"
                />
              </th>
              {columns.map((column) => (
                <th 
                  key={column.name} 
                  className="p-2 text-[10px] font-semibold text-slate-400 border-r border-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span>{column.name}</span>
                    <span className="text-[8px] text-slate-600 uppercase group-hover:text-slate-400 transition-colors">
                      {column.type}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/80 select-text">
            {activePageRows.map((row, index) => {
              const originalIndex = selectedTableData.rows.findIndex(r => r === row);
              const isSelected = selectedRowIndices.includes(originalIndex);

              return (
                <tr 
                  key={index} 
                  className={`hover:bg-slate-850/20 font-medium ${isSelected ? 'bg-slate-900/40' : ''}`}
                >
                  <td className="p-2 text-center border-r border-slate-850/35 select-none">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRowSelection(originalIndex)}
                      className="cursor-pointer"
                    />
                  </td>

                  {columns.map((col) => {
                    const cellVal = row[col.name];
                    const isCellEditing = editingCell?.rIdx === originalIndex && editingCell?.colName === col.name;

                    if (isCellEditing) {
                      return (
                        <td key={col.name} className="p-1 border-r border-emerald-800 bg-slate-900/60 w-52 select-none">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text"
                              value={editingCell.currentVal}
                              onChange={(e) => setEditingCell(prev => prev ? { ...prev, currentVal: e.target.value } : null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCellEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="bg-slate-950 text-slate-200 border border-emerald-600/70 p-1 rounded font-mono text-[11px] w-full focus:outline-none"
                              autoFocus
                            />
                            <button onClick={saveCellEdit} className="text-emerald-400 hover:text-emerald-350 cursor-pointer">
                              <Check className="w-4 h-4 shrink-0" />
                            </button>
                            <button onClick={() => setEditingCell(null)} className="text-slate-550 hover:text-slate-400 cursor-pointer">
                              <X className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        </td>
                      );
                    }

                    let valStr = cellVal === null || cellVal === undefined ? 'NULL' : String(cellVal);
                    let isNull = cellVal === null || cellVal === undefined;
                    let isDigital = typeof cellVal === 'number';

                    return (
                      <td 
                        key={col.name}
                        onDoubleClick={() => handleCellDoubleClick(originalIndex, col.name, cellVal)}
                        className={`p-2 border-r border-slate-850/35 overflow-hidden text-ellipsis max-w-[200px] whitespace-nowrap cursor-pointer hover:bg-slate-850/15 ${
                          isNull ? 'text-rose-450/60 font-light italic' : isDigital ? 'text-cyan-400 text-right' : 'text-slate-250 font-normal'
                        }`}
                        title="Double-click to live-edit database cell record"
                      >
                        {valStr}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls footer */}
      <div className="flex flex-wrap items-center justify-between select-none text-[10px] font-mono pr-1 pt-1 border-t border-slate-905">
        <div className="flex items-center gap-3 text-slate-550">
          <span>
            Displaying <strong className="text-slate-350">{totalRowsCount === 0 ? 0 : pageStartOffset + 1}</strong> to <strong className="text-slate-350">{Math.min(totalRowsCount, pageStartOffset + rowsPerPage)}</strong> of <strong className="text-emerald-400">{totalRowsCount}</strong> rows matching
          </span>
          <select 
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded cursor-pointer focus:outline-none text-[10px]"
          >
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-405 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-400">
            Page <strong className="text-slate-100">{page}</strong> / {totalPagesCount}
          </span>
          <button 
            onClick={() => setPage(prev => Math.min(totalPagesCount, prev + 1))}
            disabled={page === totalPagesCount}
            className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-405 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
