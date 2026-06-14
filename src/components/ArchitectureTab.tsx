/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  Cpu, 
  Database, 
  Activity, 
  BookOpen, 
  Workflow, 
  Play, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle, 
  Info, 
  AlertCircle, 
  GitCommit, 
  ShieldAlert, 
  DatabaseIcon, 
  HardDrive, 
  Zap, 
  Lock, 
  Shuffle, 
  HelpCircle,
  FileCode,
  Search,
  Check,
  Smartphone
} from 'lucide-react';

type MySQLSubTab = 'layered' | 'engines' | 'btree' | 'mvcc' | 'wal';

export default function ArchitectureTab() {
  const [activeSub, setActiveSub] = useState<MySQLSubTab>('layered');

  // Interactive Query Tracer State (Tab 1)
  const [tracingQuery, setTracingQuery] = useState('SELECT name FROM students WHERE id = 42;');
  const [traceStep, setTraceStep] = useState(0);
  const traceSteps = [
    {
      title: "Layer 1: Client & Connection Handler",
      component: "Connection Pool & Thread-Per-Connection",
      desc: "User initiates query offline. Connection Pool checks credentials (local sandbox bypasses auth) and assigns/allocates a dedicated execution thread.",
      activePart: "L1"
    },
    {
      title: "Layer 2: SQL Interface & Parser",
      component: "SQL Parser & Syntax Validator",
      desc: "Validates string keywords, ensures proper syntax, and compiles an internal, validated grammatical 'Parse Tree'.",
      activePart: "L2-parse"
    },
    {
      title: "Layer 2: Query Optimizer",
      component: "Cost-Based Optimizer",
      desc: "The core intelligence. Selects optimal indexes (e.g., Clustered primary index), evaluates table scanning costs, and rewrites the query internally for maximum speed.",
      activePart: "L2-opt"
    },
    {
      title: "Layer 3: Storage Engine API Interface",
      component: "Storage Engine API Handler",
      desc: "Converts the high-level optimization execution plan into specific abstract storage commands passed over the Pluggable Engine API.",
      activePart: "L3-api"
    },
    {
      title: "Layer 3: Primary InnoDB Storage Engine",
      component: "InnoDB Engine Engine Mechanics",
      desc: "Pulleys the corresponding 16KB data page from the Buffer Pool memory or fetches page sectors from disk if cached values were missing.",
      activePart: "L3-engine"
    }
  ];

  // Interactive Engine Simulator State (Tab 2)
  const [concurrencyType, setConcurrencyType] = useState<'innodb' | 'myisam'>('innodb');
  const [activeClients, setActiveClients] = useState<number>(0);
  const [engineLog, setEngineLog] = useState<string[]>(["Select engine configuration above to begin instruction step simulator"]);
  const [isSimulating, setIsSimulating] = useState(false);

  const startConcurrencySimulation = (engine: 'innodb' | 'myisam') => {
    setIsSimulating(true);
    setEngineLog(["Initializing simulation framework... Connecting 4 parallel student threads.", `Executing parallel row-updates against targeted table.`]);
    
    setTimeout(() => {
      if (engine === 'innodb') {
        setEngineLog(prev => [
          ...prev,
          "Client 1: Modifying student row ID #10 -> GRABBED ROW LOCK (ID 10) inside InnoDB tablespace.",
          "Client 2: Modifying student row ID #14 -> GRABBED ROW LOCK (ID 14) concurrently.",
          "Client 3: Querying student name (ID 10) -> Read bypasses locks using MVCC Undo Log version cleanly!",
          "✔ Completed 3 parallel activities concurrently with zero thread blocks. Pure Row-Level locking efficiency."
        ]);
      } else {
        setEngineLog(prev => [
          ...prev,
          "Client 1: Modifying row ID #10 -> GRABBED TABLE-LEVEL EXCLUSIVE WRITE LOCK on whole table.",
          "Client 2: Modifying row ID #14 -> BLOCKED! Waiting for Client 1 to release table-wide lock...",
          "Client 3: Querying student status -> BLOCKED! Reading is suspended by MyISAM write lock queue.",
          "Client 1: Commit complete -> Table lock released.",
          "Client 2: Unblocked -> Write complete.",
          "⚠ Experienced serialized lock bottleneck. Heavy read/write concurrency blocked on table-level queues."
        ]);
      }
      setIsSimulating(false);
    }, 1500);
  };

  // Interactive B+ Tree index Lookup (Tab 3)
  const [bTreeSearchKey, setBTreeSearchKey] = useState<number>(42);
  const [indexMode, setIndexMode] = useState<'clustered' | 'secondary'>('clustered');
  const [lookupStep, setLookupStep] = useState<number>(0);

  // Interactive MVCC simulation state (Tab 4)
  const [mvccStep, setMvccStep] = useState(0);

  // Interactive WAL flow (Tab 5)
  const [walStep, setWalStep] = useState(0);

  return (
    <div id="mysql-architecture-education-workspace" className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden font-sans border border-slate-900 rounded p-6 text-slate-200 overflow-y-auto scrollbar-thin">
      
      {/* Educational Banner - Offline, No Login, Step-by-Step */}
      <div className="border-b border-slate-900 pb-5 mb-5 select-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-850/50 rounded-lg text-emerald-400">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                  100% Offline Learning Sandbox
                </span>
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  No Login Required
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight mt-1 flex items-center gap-1.5">
                MySQL Engine Internals Explorer
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                Unlock the raw architectural magic of high-concurrency relational design. 
                Step-by-step visual models detailing the high-level layers, B+ Trees, InnoDB Buffer Pool, MVCC, and WAL logging protocols.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-925 border border-slate-900 rounded-lg px-4 py-2.5 max-w-[280px] font-mono text-[10px] text-slate-400 self-start lg:self-center">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <Zap className="w-3.5 h-3.5 fill-emerald-400/20" />
              <span>Offline Lab Connected</span>
            </div>
            All simulation calculators run locally in high-performance Web Assembly/memory state. No server telemetry active.
          </div>
        </div>
      </div>

      {/* Chapters Switcher Ribbon */}
      <div className="flex flex-wrap border-b border-slate-900 mb-6 gap-1 select-none">
        {[
          { id: 'layered', label: '1. Layered Architecture', icon: Layers },
          { id: 'engines', label: '2. Pluggable Engines', icon: Cpu },
          { id: 'btree', label: '3. InnoDB B+ Tree Indexes', icon: Search },
          { id: 'mvcc', label: '4. Concurrency & MVCC', icon: Shuffle },
          { id: 'wal', label: '5. WAL & Buffer Pool (ACID)', icon: HardDrive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeSub === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSub(tab.id as MySQLSubTab);
                setTraceStep(0);
                setLookupStep(0);
                setMvccStep(0);
                setWalStep(0);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-mono font-medium rounded-t border-t border-x -mb-[1px] transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-slate-900 border-slate-800 text-emerald-400 border-t-2 border-t-emerald-500 font-semibold' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Primary Chapters Canvas */}
      <div className="flex-1 min-h-0">
        
        {/* CHAPTER 1: High-Level Architecture (The Layered Design) */}
        {activeSub === 'layered' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div className="prose prose-invert max-w-none">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                <Workflow className="w-3.5 h-3.5" />
                <span>Section 1: The Layered Decoupled Blueprint</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mt-2 font-sans">
                MySQL is designed around a strictly layered architecture. The genius of this design is that connection managers and heavy SQL optimization services are completely separated from the storage mechanisms. A standard API mediates transactions between the layers.
              </p>
            </div>

            {/* Visual SQL Parsing Lifecycle Diagram & Flow */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-3 flex items-center justify-between">
                <span>INTERACTIVE PIPELINE: TRACING THE JOURNEY OF A QUERY</span>
                <span className="text-[10px] text-slate-500 lowercase leading-none font-normal font-sans">Click Step buttons below to advance the data pack!</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
                
                {/* Horizontal steps flow */}
                <div className="lg:col-span-8 flex flex-col justify-between gap-3">
                  <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-900">
                    <div className="text-[10px] text-slate-500 mb-1.5 uppercase font-bold">SQL input query playground:</div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tracingQuery}
                        onChange={(e) => {
                          setTracingQuery(e.target.value);
                          setTraceStep(0);
                        }}
                        className="flex-1 bg-slate-925 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-700 select-text"
                      />
                      <button 
                        onClick={() => setTraceStep((v) => (v + 1) % traceSteps.length)}
                        className="bg-emerald-600 hover:bg-emerald-500 transition text-slate-100 px-3 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Next State</span>
                      </button>
                    </div>
                  </div>

                  {/* Layer Block Visuals */}
                  <div className="grid grid-cols-5 gap-2 select-none text-center">
                    {traceSteps.map((s, idx) => {
                      const isCurrent = idx === traceStep;
                      const isPassed = idx < traceStep;
                      return (
                        <div 
                          key={s.title}
                          onClick={() => setTraceStep(idx)}
                          className={`p-2 rounded border text-left cursor-pointer transition-all flex flex-col justify-between h-24 ${
                            isCurrent 
                              ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200 scale-105' 
                              : isPassed 
                              ? 'border-emerald-900/40 bg-slate-900/30 text-emerald-500' 
                              : 'border-slate-850 bg-slate-950 text-slate-500'
                          }`}
                        >
                          <div className="text-[8px] font-bold text-slate-450 uppercase flex justify-between">
                            <span>Step 0{idx+1}</span>
                            {isPassed && <span className="text-emerald-400">✓</span>}
                          </div>
                          <div className="text-[9.5px] font-bold leading-tight line-clamp-2 mt-1">
                            {s.component}
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div className={`h-full ${isCurrent ? 'bg-emerald-400 w-full animate-pulse' : isPassed ? 'bg-emerald-650 w-full' : 'w-0'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Explanation Panel */}
                  <div className="bg-slate-950 border border-slate-850/60 rounded-lg p-4 h-32 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                          {traceSteps[traceStep].activePart}
                        </span>
                        <h4>{traceSteps[traceStep].title}</h4>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-slate-300 font-sans font-light">
                        {traceSteps[traceStep].desc}
                      </p>
                    </div>
                    
                    <div className="text-[9.5px] text-slate-500 flex items-center gap-1 font-sans">
                      <Info className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>The query pipeline is isolated within your safe, secure offline browser thread.</span>
                    </div>
                  </div>

                </div>

                {/* Right Side breakdown panels */}
                <div className="lg:col-span-4 bg-slate-950 p-4 rounded-lg border border-slate-850 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 border-b border-slate-900 pb-2 mb-3 tracking-wide">
                      THE THREE DISTINCT LAYERS
                    </h4>
                    
                    <div className="space-y-3 font-sans text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-rose-400 font-bold">
                          <span className="bg-rose-950 text-rose-300 px-1 rounded">L1</span>
                          <span>CONNECTION POOL & THREADING</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Allocates system threads recursively per connection socket. It maintains an open pooled inventory of connections to prevent thread-allocation load spikes.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 font-bold">
                          <span className="bg-cyan-950 text-cyan-300 px-1 rounded">L2</span>
                          <span>CORE SERVICES & OPTIMIZER</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Executes lexical parsing, validates foreign constraints, and rewrites queries for speed using strict primary indexes.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 font-bold">
                          <span className="bg-emerald-950 text-emerald-300 px-1 rounded">L3</span>
                          <span>PLUGGABLE STORAGE ENGINES</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Responsible for writing bytes securely to disk sectors or cached block states, and enforcing ACID mechanics.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Server Type:</span>
                      <span className="text-slate-200 font-mono">Zero-Login Client Sandbox</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Local Session ID:</span>
                      <span className="text-slate-200 font-mono">ACTIVE_OFFLINE</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Pluggable API Callout block */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-start gap-4">
              <div className="p-2 bg-emerald-950/50 border border-emerald-900/40 rounded-lg text-emerald-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="font-sans">
                <h4 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider">Aesthetic Core: Decoupled Storage Engine API</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  The crowning achievement of MySQL is the absolute abstraction of data storage. The SQL execution optimizer doesn't care whether the table is held in physical RAM (Memory Engine), on a solid-state disk as a cluster (InnoDB), or as flat CSV files. It interacts solely with standardized C++ abstract interface hooks: <code className="text-emerald-300 font-mono">handler::write_row()</code>, <code className="text-emerald-300 font-mono">handler::rnd_next()</code>, and <code className="text-emerald-300 font-mono">handler::index_read()</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 2: Core Storage Engines */}
        {activeSub === 'engines' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div className="prose prose-invert max-w-none">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5" />
                <span>Section 2: Pluggable Engines Comparatives with Interactive Stress Trainer</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mt-2 font-sans">
                Because of MySQL's plugin architecture, database architects select specific backend engines on a per-table basis. 
                Modern transactional workloads default specifically to **InnoDB**, whereas simple logging sometimes leveraged legacy **MyISAM**.
              </p>
            </div>

            {/* Educational Matrix Comparison Grid */}
            <div className="border border-slate-900 rounded-xl overflow-hidden text-[10.5px]">
              <div className="grid grid-cols-12 bg-slate-900 font-bold p-3.5 border-b border-slate-850 text-slate-200">
                <div className="col-span-3 font-mono uppercase tracking-wide">ARCHITECTURE FEATURE</div>
                <div className="col-span-4 border-l border-slate-800 pl-4 text-emerald-400 font-mono tracking-wide">INNODB (DEFAULT ENGINE)</div>
                <div className="col-span-5 border-l border-slate-800 pl-4 text-rose-400 font-mono tracking-wide">MYISAM (LEGACY ENGINE)</div>
              </div>

              {[
                {
                  feature: "Transaction Support",
                  innodb: "Full Transactional support (Strictly ACID-compliant). Ensure writes commit or roll back gracefully.",
                  myisam: "No transaction system. Faulty multiple inserts can leave tables half-populated."
                },
                {
                  feature: "Locking Granularity",
                  innodb: "Fine-grained Row-level locking. Incredible parallel writing efficiency on massive user loads.",
                  myisam: "Coarse Table-level locking. Any simultaneous writes lock the entire table, blocking readers completely."
                },
                {
                  feature: "Foreign Key Integrity",
                  innodb: "Highly supported with full cascade triggers, assuring structural relational integrity across schemas.",
                  myisam: "Not supported in tablespace structures. Constraints must be handled on host coding stacks."
                },
                {
                  feature: "Crash Recovery Integrity",
                  innodb: "Robust and automatic. Safely replays outstanding log buffers using sequential Redo/Undo logs.",
                  myisam: "Poor. Power drop or active thread crashes easily corrupt physical table disk blocks."
                },
                {
                  feature: "Physical Structure Design",
                  innodb: "Index-Organized (B+ Trees inside Clustered spaces). Buffers hot pages inside RAM.",
                  myisam: "Non-clustered records index. Simple heap logs with detached index sheets."
                },
                {
                  feature: "Primary Use Case",
                  innodb: "E-Commerce order workflows, online shopping carts, banking transactions, and high-performance apps.",
                  myisam: "Read-heavy static lookups, flat raw log sheets, or legacy archives (Deprecated now)."
                }
              ].map((row, idx) => (
                <div 
                  key={row.feature} 
                  className={`grid grid-cols-12 p-3.5 border-b border-slate-900 last:border-b-0 leading-relaxed ${
                    idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-920/20'
                  }`}
                >
                  <div className="col-span-3 font-semibold text-slate-400 pr-2">{row.feature}</div>
                  <div className="col-span-4 border-l border-slate-900 pl-4 text-slate-200 font-sans text-[11px] leading-relaxed">{row.innodb}</div>
                  <div className="col-span-5 border-l border-slate-900 pl-4 text-slate-400 font-sans text-[11px] leading-relaxed">{row.myisam}</div>
                </div>
              ))}
            </div>

            {/* Interactive Parallel Stress simulator */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    INTERACTIVE CONCURRENCY LAB: ROW-LEVEL VS TABLE-LEVEL LOCKS
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Trigger a simulated multi-user mock-concurrency spike to see how concurrency bottlenecks emerge.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => startConcurrencySimulation('innodb')}
                    disabled={isSimulating}
                    className="bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 transition text-slate-100 text-xs font-mono font-bold px-3 py-1.5 rounded cursor-pointer"
                  >
                    Stress InnoDB Engine 
                  </button>
                  <button 
                    onClick={() => startConcurrencySimulation('myisam')}
                    disabled={isSimulating}
                    className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-850 disabled:opacity-40 transition text-rose-300 text-xs font-mono font-bold px-3 py-1.5 rounded cursor-pointer"
                  >
                    Stress MyISAM Engine
                  </button>
                </div>
              </div>

              {/* Console Logs Simulator output */}
              <div className="bg-slate-950 rounded-lg p-4 border border-slate-900 h-44 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-900 mb-2 font-bold select-none">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Interactive Engine Activity telemetry buffer</span>
                </div>
                
                {engineLog.map((log, i) => {
                  let logColor = "text-slate-350";
                  if (log.startsWith("✔")) logColor = "text-emerald-400 font-bold";
                  if (log.startsWith("Client") && log.includes("BLOCKED")) logColor = "text-rose-400 animate-pulse";
                  if (log.startsWith("Client") && log.includes("GRABBED")) logColor = "text-cyan-400";
                  if (log.startsWith("Client 3: Querying") && log.includes("bypasses")) logColor = "text-amber-400";
                  
                  return (
                    <div key={i} className={`leading-relaxed py-0.5 ${logColor}`}>
                      {log}
                    </div>
                  );
                })}

                {isSimulating && (
                  <div className="text-slate-500 italic animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>Crunching simulated process threads...</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* CHAPTER 3: Storage and Data Layout (InnoDB Design) */}
        {activeSub === 'btree' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div className="prose prose-invert max-w-none">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                <Search className="w-3.5 h-3.5" />
                <span>Section 3: Index-Organized Tables & Clustered B+ Tree mechanics</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mt-2 font-sans">
                InnoDB is an **Index-Organized Storage System**. Instead of storing row data inside a heap file and indices elsewhere, InnoDB structures table storage inside a B+ Tree centered around the Primary Key index (called the **Clustered Index**).
              </p>
            </div>

            {/* B+ Tree Visual Mockups & Tracing logic */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    B+ TREE CELL LOOKUP SIMULATOR
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Visualize why primary key lookups execute in 1 step, while secondary index lookups require a 2-step double-traversal.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-[10px]">
                  <button 
                    onClick={() => {
                      setIndexMode('clustered');
                      setLookupStep(0);
                    }}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition ${
                      indexMode === 'clustered' ? 'bg-emerald-600 text-slate-100' : 'bg-slate-800 hover:bg-slate-750 text-slate-350'
                    }`}
                  >
                    Clustered Index (Search by PK)
                  </button>
                  <button 
                    onClick={() => {
                      setIndexMode('secondary');
                      setLookupStep(0);
                    }}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition ${
                      indexMode === 'secondary' ? 'bg-emerald-600 text-slate-100' : 'bg-slate-800 hover:bg-slate-750 text-slate-350'
                    }`}
                  >
                    Secondary Index (Search by Name)
                  </button>
                </div>
              </div>

              {/* B+ Tree Tree Graphic Simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Visual Tree Schema Grid */}
                <div className="col-span-1 lg:col-span-7 flex flex-col justify-between gap-4 p-4 bg-slate-950 border border-slate-900 rounded-lg">
                  <div className="text-[9.5px] text-slate-500 uppercase font-bold tracking-wider text-center select-none pb-1.5 border-b border-slate-900">
                    {indexMode === 'clustered' ? 'CLUSTERED B+ TREE (ROOT NODE → LEAF NODE WITH RAW ROWS)' : 'SECONDARY INDEX (NON-PRIMARY KEY TREE → PRIMARY KEY POINTERS)'}
                  </div>

                  <div className="space-y-4 font-mono select-none py-3">
                    {/* Root Node (Layer 1) */}
                    <div className="flex justify-center">
                      <div className={`p-2.5 rounded border text-center transition-all w-48 ${
                        lookupStep >= 1 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 text-slate-500 bg-slate-900/10'
                      }`}>
                        <div className="text-[8px] uppercase tracking-wider font-bold mb-0.5 text-slate-500">Root Page [Page #10]</div>
                        <div className="text-[10px] font-bold">Keys: [ 25 | 75 ]</div>
                      </div>
                    </div>

                    <div className="flex justify-center text-slate-650 h-4">
                      <div className="w-1/2 border-r border-t border-slate-850 h-full rounded-tr" />
                      <div className="w-1/2 border-l border-t border-slate-850 h-full rounded-tl" />
                    </div>

                    {/* Intermediate Index Pages (Layer 2) */}
                    <div className="flex justify-around gap-2">
                      <div className={`p-2 rounded border text-center transition-all w-36 ${
                        lookupStep === 2 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 text-slate-500 bg-slate-900/10'
                      }`}>
                        <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Interior Page #11</div>
                        <div className="text-[9.5px] font-bold">Keys: [ 10 | 20 ]</div>
                      </div>

                      <div className={`p-2 rounded border text-center transition-all w-36 ${
                        lookupStep === 2 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 text-slate-500 bg-slate-900/10'
                      }`}>
                        <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Interior Page #12</div>
                        <div className="text-[9.5px] font-bold">Keys: [ 35 | 50 ]</div>
                      </div>
                    </div>

                    <div className="flex justify-center text-slate-650 h-4">
                      <div className="w-1/4 border-r border-t border-slate-850 h-full" />
                      <div className="w-1/4 border-l border-t border-slate-850 h-full" />
                      <div className="w-1/4 border-r border-t border-slate-850 h-full" />
                      <div className="w-1/4 border-l border-t border-slate-850 h-full" />
                    </div>

                    {/* Leaf Nodes (Layer 3 - actual results) */}
                    <div className="flex justify-between gap-1 overflow-x-auto">
                      <div className={`p-1.5 rounded border text-center transition-all text-[8.5px] w-28 shrink-0 ${
                        lookupStep === 3 && bTreeSearchKey < 25 ? 'border-emerald-500 bg-emerald-955/40 text-emerald-300 scale-105' : 'border-slate-900 text-slate-600 bg-slate-950/40'
                      }`}>
                        <div className="font-bold border-b border-slate-900 pb-0.5 mb-1 text-[7.5px] text-slate-500">Leaf #21</div>
                        {indexMode === 'clustered' ? (
                          <div className="space-y-0.5 font-light">
                            <div>ID 12: "Alice"</div>
                            <div>ID 20: "Bob"</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 font-light">
                            <div>"Alice" → PK 12</div>
                            <div>"Bob" → PK 20</div>
                          </div>
                        )}
                      </div>

                      <div className={`p-1.5 rounded border text-center transition-all text-[8.5px] w-28 shrink-0 ${
                        lookupStep >= 3 && (indexMode === 'clustered' ? lookupStep === 3 : lookupStep === 3 || lookupStep === 5) ? 'border-emerald-500 bg-emerald-955/40 text-emerald-300 scale-105' : 'border-slate-900 text-slate-600 bg-slate-950/40'
                      }`}>
                        <div className="font-bold border-b border-slate-900 pb-0.5 mb-1 text-[7.5px] text-slate-500">Leaf #22</div>
                        {indexMode === 'clustered' ? (
                          <div className="space-y-0.5 font-light">
                            <div className={lookupStep === 3 ? "text-emerald-300 font-bold" : ""}>ID 42: "Charlie"</div>
                            <div>ID 48: "Dani"</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 font-light">
                            <div className={lookupStep === 3 ? "text-emerald-300 font-bold animate-pulse" : ""}>"Charlie" → ID 42</div>
                            <div>"Dani" → ID 48</div>
                          </div>
                        )}
                      </div>

                      <div className={`p-1.5 rounded border text-center transition-all text-[8.5px] w-28 shrink-0 ${
                        lookupStep === 3 && bTreeSearchKey > 50 ? 'border-emerald-500 bg-emerald-955/40 text-emerald-300 scale-105' : 'border-slate-900 text-slate-600 bg-slate-950/40'
                      }`}>
                        <div className="font-bold border-b border-slate-900 pb-0.5 mb-1 text-[7.5px] text-slate-500">Leaf #23</div>
                        {indexMode === 'clustered' ? (
                          <div className="space-y-0.5 font-light">
                            <div>ID 78: "Evan"</div>
                            <div>ID 90: "Faith"</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 font-light">
                            <div>"Evan" → PK 78</div>
                            <div>"Faith" → PK 90</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-925 p-2 rounded border border-slate-900">
                    <span className="text-[10px] text-slate-400">Search student record:</span>
                    <button 
                      onClick={() => {
                        if (indexMode === 'clustered') {
                          setLookupStep(prev => (prev + 1) % 4);
                        } else {
                          setLookupStep(prev => (prev + 1) % 6);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition select-none h-6 flex items-center gap-1"
                    >
                      <span>{lookupStep === 0 ? 'Start Trace' : 'Step Pointer →'}</span>
                    </button>
                  </div>
                </div>

                {/* Right Step Tracker and details descriptions */}
                <div className="col-span-1 lg:col-span-5 p-4 bg-slate-925 rounded-md border border-slate-850 flex flex-col justify-between text-xs shrink-0 self-stretch">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      WALKTHROUGH LOG: {indexMode === 'clustered' ? 'PRIMARY KEY ACCESS' : 'SECONDARY METRIC LOOKUP'}
                    </h4>

                    {indexMode === 'clustered' ? (
                      <div className="space-y-3 font-sans text-[11px] leading-relaxed text-slate-400">
                        <div className={`p-2 rounded border transition-colors ${lookupStep >= 1 ? 'border-emerald-850 bg-emerald-950/10 text-slate-200' : 'border-transparent text-slate-500'}`}>
                          <strong>1. Read Root Page (Page #10):</strong> Optimizer compares our target <code className="text-emerald-300 font-mono">ID = 42</code>. Since 25 &lt; 42 &lt; 75, the CPU jumps cleanly to child pointer Interior Page #12.
                        </div>
                        <div className={`p-2 rounded border transition-colors ${lookupStep >= 2 ? 'border-emerald-850 bg-emerald-950/10 text-slate-200' : 'border-transparent text-slate-500'}`}>
                          <strong>2. Traverse Interior Page #12:</strong> Comparing 42 against index anchors [35 | 50]. Because 35 &lt; 42 &lt; 50, it targets B+ Tree Leaf Page #22.
                        </div>
                        <div className={`p-2 rounded border transition-colors ${lookupStep >= 3 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200 font-medium' : 'border-transparent text-slate-500'}`}>
                          <strong>3. Fetch Row Data in Leaf #22:</strong> Complete! Since this is a <strong className="text-emerald-300 font-mono">Clustered Index</strong>, the actual row cell data for Charlie <code className={lookupStep === 3 ? "text-emerald-300 font-mono" : ""}>"Charlie" (ID 42)</code> exists inside the leaf leaf node itself. Done!
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 font-sans text-[10.5px] leading-relaxed text-slate-400">
                        <div className={`p-1.5 rounded border transition-colors ${lookupStep >= 1 ? 'border-emerald-850 bg-emerald-950/10 text-slate-200' : 'border-transparent text-slate-500'}`}>
                          <strong>1. Read Secondary Index Root:</strong> Optimizer seeks by student label Name = "Charlie".
                        </div>
                        <div className={`p-1.5 rounded border transition-colors ${lookupStep >= 2 ? 'border-emerald-850 bg-emerald-950/10 text-slate-200' : 'border-transparent text-slate-500'}`}>
                          <strong>2. Locate Pointer leaf page:</strong> Jumps down index pointers to Secondary Leaf #22.
                        </div>
                        <div className={`p-1.5 rounded border transition-colors ${lookupStep >= 3 ? 'border-emerald-850 bg-emerald-950/10 text-slate-200' : 'border-transparent text-slate-500'}`}>
                          <strong>3. Extract PK Pointer:</strong> B+ Tree leaf contains NOT raw student columns, but the primary key value <code className="text-emerald-300 font-mono font-bold">pointer (ID 42)</code>.
                        </div>
                        <div className={`p-1.5 rounded border transition-colors ${lookupStep >= 4 ? 'border-yellow-900/60 bg-yellow-950/10 text-yellow-300' : 'border-transparent text-slate-500'}`}>
                          <strong>4. Initiate 2nd Lookup (Clustered Index Jump):</strong> We cannot build response yet. Using primary key pointer ID 42, the CPU must start a completely separate lookup inside the Clustered primary B+ Tree!
                        </div>
                        <div className={`p-1.5 rounded border transition-colors ${lookupStep >= 5 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200 font-medium' : 'border-transparent text-slate-500'}`}>
                          <strong>5. Done (Row obtained):</strong> Re-traverses Root Page 10 &rarr; Interior Page 12 &rarr; Clustered Leaf 22 to extract raw column values! This is why secondary index searches demand double-hopping.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-500 font-sans leading-relaxed mt-2">
                    <p className="font-semibold text-slate-350">💡 Memory Optimization: The Buffer Pool</p>
                    Data pages are fetched in **16KB blocks** and cached inside the **InnoDB Buffer Pool** in RAM. If Page #22 is already in physical RAM, disk reads represent exactly zero latency!
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 4: Concurrency and Transaction Design (ACID & MVCC) */}
        {activeSub === 'mvcc' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div className="prose prose-invert max-w-none font-sans">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-wider">
                <Shuffle className="w-3.5 h-3.5 animate-pulse" />
                <span>Section 4: Concurrency and Transaction Design (ACID) via MVCC</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mt-2">
                Concurrently running web transactions must avoid blocking each other's execution (e.g. heavy web users shouldn't have rows locked while viewing e-commerce shopping catalogs). InnoDB employs <strong className="text-slate-100 font-mono">MVCC (Multi-Version Concurrency Control)</strong> to separate reads from writes.
              </p>
            </div>

            {/* Interactive MVCC Timeline Slider */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    MULTIVERSION CONCURRENCY TIMELINE WALKTHROUGH
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Step through an active transaction schedule which updates row data while concurrent client reads from clean Undo registers.
                  </p>
                </div>
                
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((step) => (
                    <button 
                      key={step}
                      onClick={() => setMvccStep(step)}
                      className={`w-7 h-7 rounded-full font-bold text-xs cursor-pointer transition ${
                        mvccStep === step ? 'bg-emerald-600 text-slate-100' : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-850'
                      }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic MVCC Visual Scheme */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
                
                {/* Visual Data Schema Columns - left 7 */}
                <div className="col-span-1 lg:col-span-8 flex flex-col justify-between gap-4 p-4 bg-slate-950 border border-slate-900 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold pb-2 border-b border-slate-900 select-none">
                    ACTIVE TABLE MEMORY BUFFER VS PHYSICAL UNDO LOG
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3">
                    
                    {/* Active Buffer Card */}
                    <div className="bg-slate-900 p-3.5 rounded border border-slate-850/60 flex flex-col justify-between h-40">
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-cyan-400 font-bold mb-1.5">ACTIVE IN-MEMORY BUFFER PAGE</div>
                        <div className="font-mono text-xs space-y-2">
                          <div className="text-slate-500 flex justify-between border-b border-slate-950 pb-1">
                            <span>Row:</span>
                            <span className="text-slate-300">ID #42 (Charlie)</span>
                          </div>
                          <div className="text-slate-400 flex justify-between">
                            <span>Credits:</span>
                            <strong className={`${mvccStep >= 1 ? 'text-yellow-400 font-bold animate-pulse' : 'text-slate-200'}`}>
                              {mvccStep === 0 ? '100 Credits' : mvccStep >= 1 ? '150 Credits' : '150 Credits'}
                            </strong>
                          </div>
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>Transaction:</span>
                            <strong className="text-slate-300">{mvccStep >= 1 ? 'TxID 201' : 'TxID 190'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950 py-1.5 px-2 rounded border border-slate-900 text-[10px] text-slate-400 font-sans mt-2">
                        {mvccStep === 0 ? 'Original unmodified record.' : mvccStep === 1 ? 'TxID 201 modifies value, page becomes dirty.' : mvccStep === 2 ? 'TxID 201 writes modified state, but TxID 200 is still active.' : 'TxID 201 Commits. Memory states are safe.'}
                      </div>
                    </div>

                    {/* Undo log Card */}
                    <div className="bg-slate-900 p-3.5 rounded border border-slate-850/60 flex flex-col justify-between h-40">
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-rose-400 font-bold mb-1.5">UNDO LOG ROLLBACK SEGMENTS</div>
                        <div className="font-mono text-xs space-y-2">
                          {mvccStep >= 1 ? (
                            <div className="animate-fadeIn space-y-1">
                              <div className="text-slate-500 flex justify-between border-b border-slate-950 pb-1">
                                <span>Old Value:</span>
                                <span className="text-rose-300">100 Credits</span>
                              </div>
                              <div className="text-slate-500 flex justify-between">
                                <span>Owner TxID:</span>
                                <span className="text-slate-300">TxID 190</span>
                              </div>
                              <div className="text-[9.5px] text-emerald-400 italic">
                                Read cursors routed here !
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-600 text-[11px] leading-relaxed italic pt-4">
                              Undo log is empty. No previous snapshots registered.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-950 py-1.5 px-2 rounded border border-slate-900 text-[10px] text-slate-400 font-sans mt-2">
                        {mvccStep >= 1 ? 'Older version saved sequentially in rollback records.' : 'No active modifications; no undo required.'}
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-between items-center bg-slate-925 p-2.5 rounded border border-slate-900 text-[10px] text-slate-400 font-sans">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span><strong>Isolation Level:</strong> REPEATABLE READ (Guarantees snapshots do not shift midpoint)</span>
                    </span>
                  </div>
                </div>

                {/* Right Walkthrough Logs Columns - right 5 */}
                <div className="col-span-1 lg:col-span-4 p-4 bg-slate-925 rounded-md border border-slate-850 flex flex-col justify-between text-xs self-stretch">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      STEP-BY-STEP ACCOUNTS
                    </h4>
                    
                    <div className="space-y-4 font-sans text-[11px] leading-relaxed text-slate-400">
                      <div className={`p-2 rounded border transition-colors ${mvccStep === 0 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' : 'border-transparent text-slate-500'}`}>
                        <strong>S0: Initial State:</strong> Charlie has 100 credits. Active transaction reader TxID 200 opens search cursor, pointing directly to the primary memory buffer.
                      </div>
                      <div className={`p-2 rounded border transition-colors ${mvccStep === 1 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' : 'border-transparent text-slate-500'}`}>
                        <strong>S1: Writer modifies:</strong> TxID 201 arrives and updates Charlie to 150 credits. It copy-backs original row (100 credits) to Undo Log, and marks modified page dirty inside memory.
                      </div>
                      <div className={`p-2 rounded border transition-colors ${mvccStep === 2 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' : 'border-transparent text-slate-500'}`}>
                        <strong>S2: Concurrent Safe Reads:</strong> TxID 200 queries student balance midpoint. Instead of being blocked by TxID 201's uncommitted transaction, MySQL serves the older snapshot <span className="text-emerald-400">100 Credits</span> straight from the Undo Log safely!
                      </div>
                      <div className={`p-2 rounded border transition-colors ${mvccStep === 3 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200 font-semibold' : 'border-transparent text-slate-500'}`}>
                        <strong>S3: Commit Flush:</strong> TxID 201 commits change. Memory pages persist modified state safely. Multi-Version reads ensured <strong>writes do not block reads</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] text-slate-500 leading-relaxed font-sans">
                    <p className="font-semibold text-slate-350">💡 Zero Lock overhead</p>
                    Because of MVCC, SQLite/MySQL read threads can access data structures instantly, without any physical mutex blocks.
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 5: Write-Ahead Logging (WAL) Protocol (ACID) */}
        {activeSub === 'wal' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div className="prose prose-invert max-w-none font-sans">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Section 5: The WAL Protocol (Write-Ahead Logging) & InnoDB Durability</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mt-2">
                Durability (the 'D' in ACID) guarantees that once a transaction reports success, the information remains perfectly safe even if a power failure occurs micro-seconds later. MySQL achieves this using the **Write-Ahead Logging (WAL) Protocol**.
              </p>
            </div>

            {/* Interactive WAL Pipeline step-by-step trigger */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    WAL TRANSACTION WRITE TRIGGER SEQUENCER
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Trigger a simulated transaction commit and watch sequentially how the log buffer, redo disk log, and primary table pages get sync'd.
                  </p>
                </div>

                <div className="flex gap-1.5 text-xs">
                  <button 
                    onClick={() => setWalStep(0)}
                    className="bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-850 font-bold px-2.5 py-1 rounded cursor-pointer transition select-none"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => setWalStep((v) => (v % 4) + 1)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold px-3 py-1 rounded cursor-pointer transition flex items-center gap-1"
                  >
                    <span>Execute Next Sequencer Step →</span>
                  </button>
                </div>
              </div>

              {/* WAL interactive schematic pipeline representation */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
                
                {/* Horizontal flow column graph - left 8 */}
                <div className="col-span-1 lg:col-span-8 flex flex-col justify-between gap-4 p-4 bg-slate-950 border border-slate-900 rounded-lg">
                  <div className="text-[9.5px] text-slate-500 uppercase tracking-widest font-bold pb-1 border-b border-slate-900 text-center select-none">
                    WAL WORKFLOW: SEQUENTIAL WRITE PIPELINE LOGISTICS
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] py-4 select-none">
                    
                    {/* Log Buffer (In Memory) */}
                    <div className={`p-2.5 rounded border transition-all h-32 flex flex-col justify-between ${
                      walStep >= 1 ? 'border-cyan-555 bg-cyan-950/20 text-cyan-200 scale-102' : 'border-slate-850 bg-slate-950 text-slate-650'
                    }`}>
                      <span className="font-bold uppercase text-[8px] text-slate-500">1. Log Buffer (RAM)</span>
                      <p className="text-[9.5px] font-sans font-light leading-snug mt-1 text-slate-400">
                        Transaction details appended to sequential log buffer inside RAM instantly.
                      </p>
                      <div className="text-[8.5px] font-bold py-0.5 bg-slate-900 border border-slate-850 rounded">
                        {walStep >= 1 ? 'APPENDED' : 'QUIET'}
                      </div>
                    </div>

                    {/* Redo Log File (Disk) */}
                    <div className={`p-2.5 rounded border transition-all h-32 flex flex-col justify-between ${
                      walStep >= 2 ? 'border-emerald-555 bg-emerald-955/20 text-emerald-200 scale-102' : 'border-slate-850 bg-slate-950 text-slate-650'
                    }`}>
                      <span className="font-bold uppercase text-[8px] text-slate-500">2. Redo Log (Disk)</span>
                      <p className="text-[9.5px] font-sans font-light leading-snug mt-1 text-slate-400">
                        Buffer flushed sequentially to physical storage using speedy append-only writes.
                      </p>
                      <div className="text-[8.5px] font-bold py-0.5 bg-slate-900 border border-slate-850 rounded text-emerald-400">
                        {walStep >= 2 ? 'FLUSHED ON DISK' : 'WAITING'}
                      </div>
                    </div>

                    {/* Buffer Pool Memory Page */}
                    <div className={`p-2.5 rounded border transition-all h-32 flex flex-col justify-between ${
                      walStep >= 3 ? 'border-amber-555 bg-amber-955/20 text-amber-200 scale-102' : 'border-slate-850 bg-slate-950 text-slate-650'
                    }`}>
                      <span className="font-bold uppercase text-[8px] text-slate-500">3. Buffer Pool (RAM)</span>
                      <p className="text-[9.5px] font-sans font-light leading-snug mt-1 text-slate-400">
                        Modified page inside memory marked "Dirty Page", pending disk flushing.
                      </p>
                      <div className="text-[8.5px] font-bold py-0.5 bg-slate-900 border border-slate-850 rounded text-amber-300 animate-pulse">
                        {walStep >= 3 ? 'DIRTY IN MEMORY' : 'CLEAN'}
                      </div>
                    </div>

                    {/* Tablespace DB Pages (Disk) */}
                    <div className={`p-2.5 rounded border transition-all h-32 flex flex-col justify-between ${
                      walStep >= 4 ? 'border-purple-555 bg-purple-955/20 text-purple-200 scale-104' : 'border-slate-850 bg-slate-950 text-slate-650'
                    }`}>
                      <span className="font-bold uppercase text-[8px] text-slate-500">4. Tablespace (Disk)</span>
                      <p className="text-[9.5px] font-sans font-light leading-snug mt-1 text-slate-400">
                        Background writer syncs dirty memory block to database tablespace file.
                      </p>
                      <div className="text-[8.5px] font-bold py-0.5 bg-slate-900 border border-slate-850 rounded text-purple-400">
                        {walStep >= 4 ? 'SYNCED TO DISK ✔' : 'QUEUED'}
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-925 py-2 px-3 rounded text-[10.5px] text-slate-400 font-sans leading-relaxed">
                    <strong>Critical Concept: Sequential vs Random IO Writes</strong><br />
                    Writing data cells to the tablespace demands random disk seeks (which are slow). In comparison, writing commits to the append-only **Redo Log** (Step 2) uses fast, sequential disk blocks. Once Step 2 finishes, the transaction reports 100% success back to the user thread safely.
                  </div>
                </div>

                {/* Walkthrough Log detailing actions - right 4 */}
                <div className="col-span-1 lg:col-span-4 p-4 bg-slate-925 rounded-md border border-slate-850 flex flex-col justify-between text-xs self-stretch">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      STEP-BY-STEP ACCOUNTS
                    </h4>
                    
                    <div className="space-y-4 font-sans text-[11px] leading-relaxed text-slate-400">
                      <div className={`p-1.5 rounded border transition-colors ${walStep === 1 ? 'border-cyan-850 bg-cyan-950/20 text-slate-200' : 'border-transparent text-slate-500'}`}>
                        <strong>Step 1 (RAM Log Append):</strong> The user issues write command. Instantly, detail coordinates are written into the fast, volatile, in-memory log buffer page.
                      </div>
                      <div className={`p-1.5 rounded border transition-colors ${walStep === 2 ? 'border-emerald-850 bg-emerald-955/20 text-slate-200' : 'border-transparent text-slate-500'}`}>
                        <strong>Step 2 (Redo Log Flush):</strong> The log buffer flashes data directly down to the physical sequential Redo Log on disk. Even if the computer suffers a power loss next, outstanding pages get safely reconstructed on reboot.
                      </div>
                      <div className={`p-1.5 rounded border transition-colors ${walStep === 3 ? 'border-amber-850 bg-amber-955/20 text-slate-200' : 'border-transparent text-slate-500'}`}>
                        <strong>Step 3 (Mark Mem Dirty):</strong> The target page inside our heavy in-memory Buffer Pool is modified, bearing the label "Dirty page".
                      </div>
                      <div className={`p-1.5 rounded border transition-colors ${walStep === 4 ? 'border-purple-850 bg-purple-955/20 text-slate-200' : 'border-transparent text-slate-500'}`}>
                        <strong>Step 4 (Tablespace Sync):</strong> Clean, lazy background scheduler threads sweep memory, writing dirty pages back into storage nodes (.ibd tablespaces).
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] text-slate-500 font-sans">
                    <p className="font-semibold text-rose-300/90 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Crash Durability Ensured</span>
                    </p>
                    <p className="text-[10px] text-slate-450 leading-relaxed mt-1">
                      If crash happens before Step 4 finishes, MySQL merely scans the physical Redo log on reboot, replaying changes to recover state.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
