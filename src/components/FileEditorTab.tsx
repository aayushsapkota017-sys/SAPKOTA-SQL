/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Play, 
  RefreshCw, 
  Info,
  CheckCircle,
  FileCode
} from 'lucide-react';
import { WorkspaceFile, QueryResult } from '../types';

interface FileEditorTabProps {
  activeFile: WorkspaceFile | null;
  onSaveFileContent: (path: string, newContent: string) => Promise<void>;
  onExecuteScript: (sql: string) => QueryResult;
}

export default function FileEditorTab({
  activeFile,
  onSaveFileContent,
  onExecuteScript
}: FileEditorTabProps) {
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [executionResult, setExecutionResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      setExecutionResult(null);
      setSaveStatus('idle');
    } else {
      setContent('');
    }
  }, [activeFile]);

  if (!activeFile) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center text-center p-8 font-mono border border-slate-900 rounded">
        <FileText className="w-12 h-12 text-slate-750 mb-3" />
        <h4 className="text-xs text-slate-400 font-semibold font-mono">No Workspace Script Selected</h4>
        <p className="text-[10px] text-slate-650 max-w-xs mt-1.5 leading-relaxed">
          Select or create an offline script file (e.g. schema.sql) from the left panel folder to modify or compile.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onSaveFileContent(activeFile.path, content);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('failed');
    }
  };

  const handleExecuteScriptLines = () => {
    const res = onExecuteScript(content);
    setExecutionResult(res);
  };

  const isSqlFile = activeFile.name.endsWith('.sql');

  return (
    <div id="file-editor-panel" className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden border border-slate-900 rounded p-4 font-mono select-none gap-4">
      
      {/* File Editor Control Ribbons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-450 shrink-0" />
          <span className="text-xs text-slate-250 font-bold max-w-[180px] lg:max-w-xs truncate" title={activeFile.path}>
            {activeFile.name}
          </span>
          {activeFile.isDirty && (
            <span className="text-[9px] bg-yellow-950 border border-yellow-850 text-yellow-400 px-1.5 py-0.2 rounded font-mono shrink-0">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 select-none text-[10px] font-mono">
          {isSqlFile && (
            <button 
              onClick={handleExecuteScriptLines}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-slate-100 px-3 py-1.5 rounded cursor-pointer transition"
              title="Compile and run entire file content against virtual database"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Run Script</span>
            </button>
          )}

          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-105 px-4 py-1.5 rounded border border-emerald-500/35 cursor-pointer disabled:opacity-40 select-none font-bold"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Script'}
            </span>
          </button>
        </div>
      </div>

      {/* Editor text canvas */}
      <div className="flex-1 border border-slate-850 bg-slate-950 rounded flex overflow-hidden min-h-0">
        <div className="w-9 bg-slate-900 border-r border-slate-855 select-none text-right pr-2 py-2 text-[9.5px] font-mono text-slate-650 leading-5">
          {Array.from({ length: Math.min(60, content.split('\n').length + 1) }).map((_, i) => (
            <div key={i} className="h-5">{i + 1}</div>
          ))}
        </div>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`-- Write custom code scripts here...\n-- Click 'Save Script' (keeps private to your desk disk/browser)`}
          className="flex-1 bg-transparent text-slate-100 p-2 font-mono text-[11.5px] leading-5 focus:outline-none resize-none overflow-y-auto outline-none selection:bg-slate-800 select-text font-normal"
          spellCheck={false}
          onKeyDown={(e) => {
            // Support Ctrl+S or Cmd+S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
        />
      </div>

      {/* Script Execution Console Panel */}
      {executionResult && (
        <div className="h-44 border border-slate-900 bg-slate-925/80 rounded p-3 select-text flex flex-col font-mono text-[11px] min-h-0">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 select-none">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compilation Terminal logs</span>
            </span>
            <span className="text-[10px] text-slate-350">
              Execution velocity: <strong>{executionResult.executionTimeMs} ms</strong>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 leading-relaxed scrollbar-thin">
            {executionResult.success ? (
              <div className="text-emerald-400">
                <p className="font-semibold">✓ Script execution completed successfully.</p>
                {executionResult.message && <p className="text-slate-350 text-[10px] bg-slate-950 p-2 mt-1.5 rounded">{executionResult.message}</p>}
                {executionResult.rows.length > 0 && (
                  <p className="text-[10px] text-slate-450 mt-1">Found and returned {executionResult.rows.length} row instances during inline compile.</p>
                )}
              </div>
            ) : (
              <div className="text-rose-400">
                <p className="font-bold">❌ Schema Script Compilation Error:</p>
                <p className="text-slate-200 mt-1 font-light leading-relaxed">{executionResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper info ribbon */}
      <div className="text-[9px] text-slate-650 flex items-center gap-1.5 border-t border-slate-905 pt-2 select-none">
        <Info className="w-3.5 h-3.5 text-slate-650" />
        <span>You can save scripts locally. If a disk folder is connected, content saves directly back to files on your system. Press <kbd className="bg-slate-900 px-1 border border-slate-800 rounded">Ctrl+S</kbd> to save.</span>
      </div>

    </div>
  );
}
