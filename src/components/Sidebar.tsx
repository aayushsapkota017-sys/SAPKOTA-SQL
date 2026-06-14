/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, 
  FolderOpen, 
  FileCode, 
  FileSpreadsheet, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Key, 
  Link, 
  Download, 
  Upload, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { DatabaseState, WorkspaceFile, ActiveTab } from '../types';

interface SidebarProps {
  dbState: DatabaseState;
  activeDbName: string;
  onChangeDbName: (name: string) => void;
  onResetDb: (presetName: 'chinook' | 'project' | 'iot') => void;
  onImportSql: (sql: string) => void;
  onExportSql: () => void;
  workspaceFiles: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  onSelectFile: (file: WorkspaceFile) => void;
  onCreateFile: (name: string) => void;
  onDeleteFile: (path: string) => void;
  onSelectFolder: () => Promise<void>;
  folderName: string | null;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onQuickQuery: (sql: string) => void;
}

export default function Sidebar({
  dbState,
  activeDbName,
  onChangeDbName,
  onResetDb,
  onImportSql,
  onExportSql,
  workspaceFiles,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onSelectFolder,
  folderName,
  activeTab,
  onChangeTab,
  onQuickQuery,
}: SidebarProps) {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    genres: true,
    artists: true,
    albums: false,
    tracks: false,
  });
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      let suffix = newFileName.includes('.') ? '' : '.sql';
      onCreateFile(newFileName.trim() + suffix);
      setNewFileName('');
      setShowNewFileForm(false);
    }
  };

  const triggerSqlFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql,.txt';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onImportSql(text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.sql')) return <FileCode className="w-4 h-4 text-emerald-400" />;
    if (fileName.endsWith('.csv')) return <FileSpreadsheet className="w-4 h-4 text-cyan-400" />;
    if (fileName.endsWith('.json')) return <FileCode className="w-4 h-4 text-rose-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div id="sidebar-panel" className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none">
      {/* Brand & Database Select */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-500 animate-pulse" />
          <span className="font-mono text-base font-bold text-slate-100 tracking-tight">LiteSQL Studio</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-medium ml-auto">OFFLINE</span>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={activeDbName}
            onChange={(e) => onChangeDbName(e.target.value)}
            className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="music_store.db">🎵 music_store.db</option>
            <option value="project_tracker.db">💼 project_tracker.db</option>
            <option value="iot_sensor_readings.db">📡 iot_sensors.db</option>
          </select>

          <div className="relative">
            <button 
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
              title="Reset to Sample Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-950 border border-slate-800 rounded shadow-xl z-50 text-xs font-mono">
                <div className="p-2 border-b border-slate-800 text-slate-400 text-[10px] font-bold">RELOAD DATASET</div>
                <button 
                  onClick={() => { onResetDb('chinook'); setShowPresetMenu(false); }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-850 cursor-pointer flex items-center justify-between"
                >
                  <span>Music Store</span>
                  <span className="text-[10px] text-slate-500">4 tables</span>
                </button>
                <button 
                  onClick={() => { onResetDb('project'); setShowPresetMenu(false); }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-850 cursor-pointer flex items-center justify-between"
                >
                  <span>Project Board</span>
                  <span className="text-[10px] text-slate-500">3 tables</span>
                </button>
                <button 
                  onClick={() => { onResetDb('iot'); setShowPresetMenu(false); }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-850 cursor-pointer flex items-center justify-between"
                >
                  <span>IoT Readings</span>
                  <span className="text-[10px] text-slate-500">2 tables</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={triggerSqlFileInput}
            className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded border border-slate-700 text-[10px] font-mono cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>Import SQL</span>
          </button>
          <button 
            onClick={onExportSql}
            className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded border border-slate-700 text-[10px] font-mono cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Dump Schema</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950 p-1">
        <button
          onClick={() => onChangeTab('query')}
          className={`text-center py-1.5 text-[9.5px] font-mono font-medium rounded cursor-pointer transition-colors ${
            activeTab === 'query' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => onChangeTab('terminal')}
          className={`text-center py-1.5 text-[9.5px] font-mono font-medium rounded cursor-pointer transition-colors ${
            activeTab === 'terminal' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          CLI
        </button>
        <button
          onClick={() => onChangeTab('table-explorer')}
          className={`text-center py-1.5 text-[9.5px] font-mono font-medium rounded cursor-pointer transition-colors ${
            activeTab === 'table-explorer' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => onChangeTab('diagram')}
          className={`text-center py-1.5 text-[9.5px] font-mono font-medium rounded cursor-pointer transition-colors ${
            activeTab === 'diagram' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ERD
        </button>
        <button
          onClick={() => onChangeTab('architecture')}
          className={`text-center py-1.5 text-[9.5px] font-mono font-medium rounded cursor-pointer transition-colors ${
            activeTab === 'architecture' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="MySQL Engine Architecture & Internals"
        >
          Design
        </button>
      </div>

      {/* Scrollable Side Panels */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
        
        {/* Local Disk Project Files Workspace */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">LOCAL USER WORKSPACE</span>
            <button 
              onClick={onSelectFolder}
              className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 rounded cursor-pointer"
            >
              <FolderOpen className="w-2.5 h-2.5" />
              <span>{folderName ? 'Change Dir' : 'Open Disk Dir'}</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded p-2 mb-2">
            {folderName ? (
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 mb-2 truncate">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>/{folderName}</span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 font-mono leading-relaxed mb-2">
                📂 Connect any active local folder from your hard disk to write schema scripts and logs securely and privately.
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-900">
              <button 
                onClick={() => setShowNewFileForm(!showNewFileForm)}
                className="flex items-center gap-1 text-[9px] font-mono text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Create file</span>
              </button>
            </div>

            {showNewFileForm && (
              <form onSubmit={handleCreateFileSubmit} className="mt-2 flex gap-1.5">
                <input 
                  type="text" 
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Filename.sql"
                  autoFocus
                  className="flex-1 bg-slate-900 border border-slate-750 text-xs px-2 py-1 rounded font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-slate-150 px-2 py-1 text-xs rounded font-mono cursor-pointer">
                  Add
                </button>
              </form>
            )}
          </div>

          {/* Files List Layout */}
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {workspaceFiles.length === 0 ? (
              <div className="text-[10px] text-slate-600 font-mono text-center py-2">No workspace files cataloged.</div>
            ) : (
              workspaceFiles.map((file) => (
                <div 
                  key={file.path}
                  onClick={() => {
                    onSelectFile(file);
                    onChangeTab('file-editor');
                  }}
                  className={`flex items-center justify-between p-1.5 rounded font-mono text-xs cursor-pointer transition-all ${
                    activeFile?.path === file.path ? 'bg-slate-800 border-l-2 border-emerald-500' : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getFileIcon(file.name)}
                    <span className="text-slate-300 truncate">{file.name}</span>
                    {file.isDirty && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0" title="Unsaved changes" />}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete file "${file.name}"?`)) {
                        onDeleteFile(file.path);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Catalog Table Catalog Explorer */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">DATABASE CATALOG</span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              {Object.keys(dbState.tables).length} Relations
            </span>
          </div>

          {Object.keys(dbState.tables).length === 0 ? (
            <div className="text-center p-4">
              <p className="text-[10px] text-slate-600 font-mono">Database schema is clean/empty.</p>
              <button 
                onClick={() => onResetDb('chinook')}
                className="mt-2 text-[10px] text-emerald-400 hover:underline font-mono cursor-pointer"
              >
                + Seed sample tables
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {Object.values(dbState.tables).map((t) => {
                const isExpanded = !!expandedTables[t.name];
                return (
                  <div key={t.name} className="border border-slate-850/60 rounded overflow-hidden">
                    {/* Header Table row */}
                    <div 
                      onClick={() => toggleTable(t.name)}
                      className="flex items-center justify-between px-2.5 py-2 bg-slate-950 hover:bg-slate-850 cursor-pointer text-xs font-mono font-semibold"
                    >
                      <div className="flex items-center gap-1 text-slate-250 truncate">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                        <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        {t.rows.length} rows
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-900/60 p-2 border-t border-slate-950 text-[11px] font-mono space-y-1.5 text-slate-400">
                        
                        <div className="grid grid-cols-2 gap-1 mb-2 border-b border-slate-850 pb-1.5">
                          <button 
                            onClick={() => {
                              onQuickQuery(`SELECT * FROM ${t.name} LIMIT 10;`);
                              onChangeTab('query');
                            }}
                            className="bg-slate-950 hover:bg-slate-850 text-slate-300 text-[9px] py-1 text-center rounded border border-slate-800 cursor-pointer"
                          >
                            Query Data
                          </button>
                          <button 
                            onClick={() => {
                              onQuickQuery(`SELECT COUNT(*), strftime('%Y', datetime) FROM ${t.name} GROUP BY 2;`);
                              onQuickQuery(`SELECT * FROM ${t.name};`);
                              // Hack to set explorer table name
                              const tabEl = document.getElementById(`tab-explorer-selector`);
                              if (tabEl) {
                                (tabEl as HTMLSelectElement).value = t.name;
                                tabEl.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                              onChangeTab('table-explorer');
                            }}
                            className="bg-slate-950 hover:bg-slate-850 text-slate-300 text-[9px] py-1 text-center rounded border border-slate-800 cursor-pointer"
                          >
                            Grid View
                          </button>
                        </div>

                        <div className="space-y-1 font-mono text-[10px]">
                          {t.schema.columns.map((col) => (
                            <div key={col.name} className="flex items-center justify-between text-slate-400 px-1">
                              <div className="flex items-center gap-1 truncate">
                                {col.isPrimaryKey ? (
                                  <Key className="w-2.5 h-2.5 text-yellow-500 shrink-0" title="Primary Key" />
                                ) : col.foreignKey ? (
                                  <Link className="w-2.5 h-2.5 text-cyan-400 shrink-0" title={`Foreign Key: ${col.foreignKey.table}.${col.foreignKey.column}`} />
                                ) : (
                                  <span className="w-2.5 h-2.5 inline-block shrink-0" />
                                )}
                                <span className={col.isPrimaryKey ? 'text-yellow-400 font-semibold' : 'text-slate-300'}>{col.name}</span>
                              </div>
                              <span className="text-slate-500 text-[9px] uppercase font-light">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>

      {/* Database Properties & Help footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 mt-auto text-[10px] font-mono text-slate-500 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400">Offline SQLite Sandbox</span>
        </div>
        <p className="text-[9px] leading-relaxed">
          This system parses, compiles, and executes relational operations entirely inside your browser's private memory sandbox. Files are kept secure and local.
        </p>
      </div>
    </div>
  );
}
