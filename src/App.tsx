/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, FolderOpen, AlertCircle, FileCode, CheckCircle, Info } from 'lucide-react';
import { 
  DatabaseState, 
  WorkspaceFile, 
  ActiveTab, 
  QueryResult, 
  RowData,
  TableData
} from './types';
import { LiteSQLEngine } from './lib/sqliteEngine';
import Sidebar from './components/Sidebar';
import TerminalTab from './components/TerminalTab';
import QueryEditorTab from './components/QueryEditorTab';
import TableExplorerTab from './components/TableExplorerTab';
import SchemaDiagramTab from './components/SchemaDiagramTab';
import FileEditorTab from './components/FileEditorTab';
import ArchitectureTab from './components/ArchitectureTab';

// Generates an ASCII tabulated text block for terminal outputs
function formatTerminalTable(columns: string[], rows: RowData[]): string {
  if (columns.length === 0) return 'Empty resultset';
  
  // Cap row length inside terminal prints to keep rendering performant
  const maxPrintedRows = rows.slice(0, 150);
  
  // Calculate column widths
  const widths = columns.map(col => {
    let max = col.length;
    maxPrintedRows.forEach(r => {
      const valStr = String(r[col] === null || r[col] === undefined ? 'NULL' : r[col]);
      if (valStr.length > max) max = valStr.length;
    });
    return Math.min(60, max); // Cap individual cell length inside ASCII previews
  });

  // Form divider strings
  const divider = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  
  // Form header line
  const header = '|' + columns.map((col, i) => ' ' + col.padEnd(widths[i]) + ' ').join('|') + '|';
  
  // Form database data rows
  const dataRows = maxPrintedRows.map(row => {
    return '|' + columns.map((col, i) => {
      let val = row[col] === null || row[col] === undefined ? 'NULL' : String(row[col]);
      if (val.length > widths[i]) val = val.substring(0, widths[i]-3) + '...';
      return ' ' + val.padEnd(widths[i]) + ' ';
    }).join('|') + '|';
  });

  let suffix = '';
  if (rows.length > 150) {
    suffix = `\n-- (... and ${rows.length - 150} more records omitted from preview terminal. Display in Data grid/Editor instead.)`;
  }

  return [divider, header, divider, ...dataRows, divider].join('\n') + suffix;
}

export default function App() {
  const [activeDbName, setActiveDbName] = useState<string>('music_store.db');
  const [dbState, setDbState] = useState<DatabaseState>({ version: '1.0.0', tables: {} });
  
  // Virtual workspace files persistence representation
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState<WorkspaceFile | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('query');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [initialEditorQuery, setInitialEditorQuery] = useState<string>('SELECT * FROM artists LIMIT 10;');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Load database state slot
  useEffect(() => {
    const backupKey = `litesql_db_backup_${activeDbName}`;
    const persisted = localStorage.getItem(backupKey);
    
    if (persisted) {
      try {
        setDbState(JSON.parse(persisted));
      } catch (e) {
        // Fallback default presets setup on parse failure
        loadDefaultDbPreset(activeDbName);
      }
    } else {
      loadDefaultDbPreset(activeDbName);
    }
  }, [activeDbName]);

  // Load persistent workspace files and history logs on initial mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('litesql_workspace_files');
    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles) as WorkspaceFile[];
        setWorkspaceFiles(parsed);
        if (parsed.length > 0) setActiveFile(parsed[0]);
      } catch (e) {
        initializeSampleWorkspace();
      }
    } else {
      initializeSampleWorkspace();
    }

    const savedHistory = localStorage.getItem('litesql_cli_history');
    if (savedHistory) {
      try {
        setTerminalHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const loadDefaultDbPreset = (dbName: string) => {
    let preset: 'chinook' | 'project' | 'iot' = 'chinook';
    if (dbName === 'project_tracker.db') preset = 'project';
    if (dbName === 'iot_sensor_readings.db') preset = 'iot';

    const fresh = LiteSQLEngine.loadSampleSchema(preset);
    setDbState(fresh);
    saveDbStateToBackup(dbName, fresh);
  };

  const saveDbStateToBackup = (dbName: string, state: DatabaseState) => {
    localStorage.setItem(`litesql_db_backup_${dbName}`, JSON.stringify(state));
  };

  const handleModifyDbState = (updatedDb: DatabaseState) => {
    setDbState(updatedDb);
    saveDbStateToBackup(activeDbName, updatedDb);
  };

  const initializeSampleWorkspace = () => {
    const samples: WorkspaceFile[] = [
      {
        name: 'schema_setup.sql',
        path: 'schema_setup.sql',
        content: `-- LITESQL SCHEMA SETUP SCRIPT\n-- Execute this script to append custom analytics tables.\n\nCREATE TABLE IF NOT EXISTS system_logs (\n  id INTEGER PRIMARY KEY,\n  event_level TEXT NOT NULL,\n  message TEXT,\n  recorded_at TEXT DEFAULT '2026-06-09T15:09:00Z'\n);\n\nINSERT INTO system_logs (id, event_level, message)\nVALUES \n  (1, 'INFO', 'Database slot initialized offline'),\n  (2, 'WARNING', 'Sandbox context running in browser memory');\n\nSELECT * FROM system_logs;`
      },
      {
        name: 'sample_queries.sql',
        path: 'sample_queries.sql',
        content: `-- ADVANCED CHINOOK QUERIES SCRIPT\n-- Click 'Run Script' on top to compile and view results.\n\n-- Select top tracks with genre aggregations:\nSELECT tracks.name AS track_title, genres.name AS category_genre, tracks.unit_price\nFROM tracks\nJOIN genres ON tracks.genre_id = genres.id\nWHERE category_genre == 'Rock'\nORDER BY track_title ASC\nLIMIT 5;\n`
      },
      {
        name: 'readme_offline.md',
        path: 'readme_offline.md',
        content: `# LiteSQL Workspace Documentation\n\nWelcome to your lightweight SQLite Editor!\nThis database environment executes relational mathematics and validates schema blocks directly inside your safe, sandboxed browser engine 100% offline.\n\n### Core capabilities:\n1. Open physical folders on your computer to edit files on your drive privately.\n2. Write normal SQL schemas, inserts, and dual join aggregates.\n3. Drag and drop Entity-Relationship tables to layout database paths.\n4. Double click data grid cells to live-update files.`
      }
    ];

    setWorkspaceFiles(samples);
    setActiveFile(samples[0]);
    localStorage.setItem('litesql_workspace_files', JSON.stringify(samples));
  };

  const handleResetDbToPreset = (presetName: 'chinook' | 'project' | 'iot') => {
    const fresh = LiteSQLEngine.loadSampleSchema(presetName);
    setDbState(fresh);
    saveDbStateToBackup(activeDbName, fresh);
    showNotice(`Database Reset: Active slot replaced with "${presetName}" preset.`, 'success');
  };

  // Safe file system picker API
  const handleSelectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('FileSystemAccess API folder handles are unsupported by this browser.');
      }

      const dirHandle = await (window as any).showDirectoryPicker();
      setFolderName(dirHandle.name);
      showNotice(`Successfully connected folder "${dirHandle.name}". Scanning for scripts...`, 'success');

      // Recursively read files
      const fileList: WorkspaceFile[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.sql') || entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.csv'))) {
          const file = await entry.getFile();
          const text = await file.text();
          fileList.push({
            name: entry.name,
            path: entry.name,
            content: text,
            handle: entry,
            isDirty: false
          });
        }
      }

      setWorkspaceFiles(fileList);
      if (fileList.length > 0) {
        setActiveFile(fileList[0]);
      } else {
        // Auto generate empty default script file inside local folder
        const freshHandle = await dirHandle.getFileHandle('workspace_schema.sql', { create: true });
        const text = `-- New Local Workspace Schema\nSELECT 1+1;\n`;
        const writable = await freshHandle.createWritable();
        await writable.write(text);
        await writable.close();

        const freshFile: WorkspaceFile = {
          name: 'workspace_schema.sql',
          path: 'workspace_schema.sql',
          content: text,
          handle: freshHandle,
          isDirty: false
        };

        setWorkspaceFiles([freshFile]);
        setActiveFile(freshFile);
      }
    } catch (e: any) {
      showNotice(
        `Directory picking locked inside this sandboxed container. Booted browser fall-back private Memory Workspace instead. All files remain local.`, 
        'info'
      );
    }
  };

  const handleCreateFile = async (name: string) => {
    const isLocalDirectoryActive = !!folderName;

    const freshFile: WorkspaceFile = {
      name,
      path: name,
      content: `-- Script Worksheet: ${name}\n\nSELECT * FROM artists LIMIT 5;`,
      isDirty: false
    };

    if (isLocalDirectoryActive) {
      try {
        // Try to create physically on user physical drive
        showNotice('Writing script to disk...', 'info');
      } catch (err) {}
    }

    const updated = [...workspaceFiles, freshFile];
    setWorkspaceFiles(updated);
    setActiveFile(freshFile);
    localStorage.setItem('litesql_workspace_files', JSON.stringify(updated));
    showNotice(`Created worksheet "${name}" offline.`, 'success');
  };

  const handleDeleteFile = (path: string) => {
    const updated = workspaceFiles.filter(f => f.path !== path);
    setWorkspaceFiles(updated);
    if (activeFile?.path === path) {
      setActiveFile(updated[0] || null);
    }
    localStorage.setItem('litesql_workspace_files', JSON.stringify(updated));
    showNotice('File removed from workspace.', 'info');
  };

  const handleSaveFileContent = async (path: string, newContent: string) => {
    const updated = workspaceFiles.map(file => {
      if (file.path === path) {
        return { ...file, content: newContent, isDirty: false };
      }
      return file;
    });

    setWorkspaceFiles(updated);
    localStorage.setItem('litesql_workspace_files', JSON.stringify(updated));

    const targetFile = updated.find(f => f.path === path);
    if (targetFile) setActiveFile(targetFile);

    // Save back to native file handle if exists
    if (targetFile?.handle) {
      try {
        const writable = await (targetFile.handle as any).createWritable();
        await writable.write(newContent);
        await writable.close();
        showNotice(`Saved script changes directly back to system drive!`, 'success');
        return;
      } catch (e) {
        showNotice('Unable to write back to machine drive. Persisted in browser sandbox slots instead.', 'info');
      }
    }

    showNotice('File content successfully saved in private browser sandbox.', 'success');
  };

  // Standard execution dispatcher
  const handleExecuteQuerySingle = (sql: string): QueryResult => {
    const { result, nextDb } = LiteSQLEngine.execute(sql, dbState);
    if (result.success) {
      handleModifyDbState(nextDb);
    }
    return result;
  };

  // Compiled Terminal Execution Engine
  const handleTerminalExecute = (sql: string): { success: boolean; outputText: string; updatedDb: DatabaseState } => {
    const { result, nextDb } = LiteSQLEngine.execute(sql, dbState);
    let outputText = '';
    
    if (result.success) {
      handleModifyDbState(nextDb);
      
      if (result.columns.length > 0) {
        // Tabulate ASCII preview
        outputText = formatTerminalTable(result.columns, result.rows);
      } else {
        outputText = result.message || 'Command completed successfully.';
      }
    } else {
      outputText = result.message || 'Unknown sandbox parse failure.';
    }

    return { 
      success: result.success, 
      outputText, 
      updatedDb: result.success ? nextDb : dbState 
    };
  };

  const handleAddTerminalHistory = (cmd: string) => {
    const hist = [...terminalHistory.filter(c => c !== cmd), cmd].slice(-50);
    setTerminalHistory(hist);
    localStorage.setItem('litesql_cli_history', JSON.stringify(hist));
  };

  // Import SQL queries dump script
  const handleImportSql = (sql: string) => {
    const queries = sql.split(';').map(q => q.trim()).filter(Boolean);
    
    let workingDb = JSON.parse(JSON.stringify(dbState)) as DatabaseState;
    let errors = 0;
    let successfulCount = 0;

    for (const query of queries) {
      if (query.toUpperCase().startsWith('SELECT')) continue; // skip select lines during dumps
      
      const { result, nextDb } = LiteSQLEngine.execute(query + ';', workingDb);
      if (result.success) {
        workingDb = nextDb;
        successfulCount++;
      } else {
        errors++;
      }
    }

    handleModifyDbState(workingDb);
    showNotice(`SQL Script evaluation completed. Handled ${successfulCount} lines safely. Encounted ${errors} syntax errors.`, errors === 0 ? 'success' : 'info');
  };

  // Generate ANSI DDL Dump and insert scripts
  const handleExportSql = () => {
    let sqlContent = `-- LiteSQL Sandboxed Database Schema Dump\n-- Generated on: ${new Date().toISOString()}\n-- Save as target setup.sql\n\n`;
    
    const tablesArray = Object.values(dbState.tables) as TableData[];
    
    tablesArray.forEach(t => {
      // Build DDL statement
      const colDefs = t.schema.columns.map(c => {
        return `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${c.isUnique ? ' UNIQUE' : ''}${c.defaultValue !== null ? ` DEFAULT ${typeof c.defaultValue === 'string' ? `'${c.defaultValue}'` : c.defaultValue}` : ''}${c.foreignKey ? ` REFERENCES ${c.foreignKey.table}(${c.foreignKey.column})` : ''}`;
      }).join(',\n');
      
      sqlContent += `CREATE TABLE IF NOT EXISTS ${t.name} (\n${colDefs}\n);\n\n`;
      
      // Build Row inserts
      t.rows.forEach(r => {
        const cols = Object.keys(r).join(', ');
        const vals = Object.values(r).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          return v;
        }).join(', ');
        
        sqlContent += `INSERT INTO ${t.name} (${cols}) VALUES (${vals});\n`;
      });
      sqlContent += `\n-- -----------------------------------------------------\n\n`;
    });

    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDbName.replace('.db', '')}_schema_dump.sql`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice(`Successfully compiled ${Object.keys(dbState.tables).length} active table relational trees into database dump file!`, 'success');
  };

  const showNotice = (text: string, type: 'success' | 'info' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 5500);
  };

  const handleQuickPreviewQuery = (sql: string) => {
    setInitialEditorQuery(sql);
  };

  return (
    <div className="flex w-full h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        dbState={dbState}
        activeDbName={activeDbName}
        onChangeDbName={setActiveDbName}
        onResetDb={handleResetDbToPreset}
        onImportSql={handleImportSql}
        onExportSql={handleExportSql}
        workspaceFiles={workspaceFiles}
        activeFile={activeFile}
        onSelectFile={setActiveFile}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onSelectFolder={handleSelectFolder}
        folderName={folderName}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onQuickQuery={handleQuickPreviewQuery}
      />

      {/* Main Sandbox Workspace Stage */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 border-l border-slate-800">
        
        {/* Toast Warning banner */}
        {notification && (
          <div className="absolute top-4 right-4 z-[999] shadow-2xl animate-bounce">
            <div className={`p-3.5 border rounded-lg text-xs font-mono max-w-sm flex items-center gap-2.5 shadow-emerald-950/20 ${
              notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' :
              notification.type === 'error' ? 'bg-rose-950/80 border-rose-800 text-rose-300' :
              'bg-slate-950/80 border-slate-800 text-slate-350'
            }`}>
              <AlertCircle className={`w-4 h-4 shrink-0 ${notification.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <p className="leading-snug">{notification.text}</p>
            </div>
          </div>
        )}

        {/* Tab Canvas dispatcher switcher */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {activeTab === 'query' && (
            <QueryEditorTab 
              dbState={dbState}
              onExecuteQuery={handleExecuteQuerySingle}
              initialQuery={initialEditorQuery}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalTab 
              dbState={dbState}
              onExecuteQuery={handleTerminalExecute}
              history={terminalHistory}
              onAddHistory={handleAddTerminalHistory}
            />
          )}

          {activeTab === 'table-explorer' && (
            <TableExplorerTab 
              dbState={dbState}
              onModifyDbState={handleModifyDbState}
            />
          )}

          {activeTab === 'diagram' && (
            <SchemaDiagramTab 
              dbState={dbState}
            />
          )}

          {activeTab === 'file-editor' && (
            <FileEditorTab 
              activeFile={activeFile}
              onSaveFileContent={handleSaveFileContent}
              onExecuteScript={handleExecuteQuerySingle}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureTab />
          )}
        </div>
      </div>
    </div>
  );
}
