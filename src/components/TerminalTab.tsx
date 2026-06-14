/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { TerminalLine, DatabaseState } from '../types';
import { LiteSQLEngine } from '../lib/sqliteEngine';

interface TerminalTabProps {
  dbState: DatabaseState;
  onExecuteQuery: (sql: string) => { success: boolean; outputText: string; updatedDb: DatabaseState };
  history: string[];
  onAddHistory: (cmd: string) => void;
}

export default function TerminalTab({
  dbState,
  onExecuteQuery,
  history,
  onAddHistory,
}: TerminalTabProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'info', text: 'LiteSQL Virtual Machine [Version 3.45.0 (WASM Memory Engine)]', timestamp: new Date().toLocaleTimeString() },
    { type: 'info', text: 'Enter SQL statements terminated with a ";"', timestamp: new Date().toLocaleTimeString() },
    { type: 'info', text: 'Enter ".help" for list of active SQLite shell commands and dot controls.', timestamp: new Date().toLocaleTimeString() },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [multiLineBuffer, setMultiLineBuffer] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  const scrollToBottom = () => {
    terminalLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        let newIndex = historyIndex + 1;
        if (newIndex >= history.length) newIndex = history.length - 1;
        setHistoryIndex(newIndex);
        setInputVal(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(newIndex);
        setInputVal(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleAutoComplete();
    }
  };

  const handleAutoComplete = () => {
    const keywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
      'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'VALUES',
      'INT', 'TEXT', 'REAL', 'PRIMARY KEY', 'NOT NULL', 'FOREIGN KEY', 'REFERENCES'
    ];
    const tableNames = Object.keys(dbState.tables);
    const suggestions = [...keywords, ...tableNames];

    const words = inputVal.split(/\s+/);
    const lastWord = words[words.length - 1].toUpperCase();
    if (!lastWord) return;

    const match = suggestions.find(s => s.startsWith(lastWord));
    if (match) {
      words[words.length - 1] = match;
      setInputVal(words.join(' '));
    }
  };

  const handleSendCommand = () => {
    const cmd = inputVal.trim();
    if (!cmd) return;

    const timestamp = new Date().toLocaleTimeString();
    
    // Add typed input to terminal screen log
    const promptLabel = multiLineBuffer ? '   ...> ' : 'sqlite> ';
    setLines(prev => [...prev, { type: 'input', text: promptLabel + inputVal, timestamp }]);
    onAddHistory(inputVal);
    setHistoryIndex(-1);
    setInputVal('');

    // Handle single line DOT commands immediately
    if (cmd.startsWith('.')) {
      evaluateAndAppend(cmd, timestamp);
      return;
    }

    // Accumulate lines if statement lacks a terminal semicolon
    const parsedBuffer = multiLineBuffer ? multiLineBuffer + '\n' + inputVal : inputVal;
    if (!cmd.endsWith(';')) {
      setMultiLineBuffer(parsedBuffer);
      return;
    }

    // Run active gathered compound instructions
    setMultiLineBuffer('');
    evaluateAndAppend(parsedBuffer, timestamp);
  };

  const evaluateAndAppend = (queries: string, timestamp: string) => {
    const { success, outputText, updatedDb } = onExecuteQuery(queries);
    
    // Process results back into rows and display beautifully as monospace ascii format
    setLines(prev => [
      ...prev,
      { 
        type: success ? 'output' : 'error', 
        text: outputText, 
        timestamp 
      }
    ]);
  };

  const clearTerminal = () => {
    setLines([
      { type: 'info', text: 'Console buffer cleared. Standard offline SQLite interfaces listening.', timestamp: new Date().toLocaleTimeString() }
    ]);
    setMultiLineBuffer('');
  };

  return (
    <div 
      id="terminal-container"
      className="flex-1 bg-slate-950 flex flex-col h-full font-mono text-xs border border-slate-900 rounded p-4"
      onClick={focusInput}
    >
      {/* CLI Bar Terminal Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-900 mb-3 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-350 text-[10px] font-bold tracking-wider uppercase">SQLite Desktop Core CLI</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            clearTerminal();
          }}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-350 bg-slate-900/60 hover:bg-slate-900 px-2.5 py-1 rounded border border-slate-850 cursor-pointer"
          title="Clear console window"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Terminal History Container */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 scrollbar-thin scrollbar-thumb-slate-800 pr-1 select-text">
        {lines.map((line, idx) => {
          let textStyling = 'text-slate-300';
          if (line.type === 'input') textStyling = 'text-cyan-400 font-semibold';
          if (line.type === 'error') textStyling = 'text-rose-400 border border-rose-950/40 bg-rose-950/15 p-2 rounded';
          if (line.type === 'info') textStyling = 'text-emerald-500/80 font-light italic';
          if (line.type === 'output') textStyling = 'text-amber-100 whitespace-pre scrollbar-thin';

          return (
            <div key={idx} className="leading-relaxed break-all">
              <span className="text-[9px] text-slate-600 mr-2 border border-slate-900 px-1 py-0.2 rounded select-none">
                {line.timestamp}
              </span>
              <pre className={`inline-block font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${textStyling}`}>{line.text}</pre>
            </div>
          );
        })}
        <div ref={terminalLogsEndRef} />
      </div>

      {/* CLI Entry prompt input */}
      <div className="flex items-center gap-1 bg-slate-925 border border-slate-900 hover:border-slate-800 focus-within:border-emerald-600 rounded px-3 py-2.5 transition-all">
        <span className="text-emerald-400 font-bold select-none pr-1">
          {multiLineBuffer ? '   ...>' : 'sqlite>'}
        </span>
        <input 
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={multiLineBuffer ? 'Continue query SQL statement...' : 'SELECT * FROM table; (Press TAB for completions)'}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-[11px] outline-none"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSendCommand();
          }}
          className="p-1 text-slate-500 hover:text-emerald-400 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CLI Helper Commands bar */}
      <div className="flex items-center gap-3 text-[9px] text-slate-600 mt-2 select-none">
        <span className="font-semibold text-slate-500">CLI HINTS:</span>
        <span>• Semicolon (;) executes.</span>
        <span>• [Up/Down Arrows] matches histories.</span>
        <span>• [TAB] autocompletes syntax.</span>
        <span>• Enter <code className="text-emerald-600 bg-emerald-950/20 px-1 rounded">.tables</code> or <code className="text-emerald-600 bg-emerald-950/20 px-1 rounded">.help</code></span>
      </div>
    </div>
  );
}
