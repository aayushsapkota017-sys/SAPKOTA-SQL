/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Database, Key, Link, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { DatabaseState } from '../types';

interface SchemaDiagramTabProps {
  dbState: DatabaseState;
}

interface Point {
  x: number;
  y: number;
}

export default function SchemaDiagramTab({ dbState }: SchemaDiagramTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tables = Object.values(dbState.tables);
  
  // Track table node positions
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Auto layout tables on first load or schema changes
  useEffect(() => {
    const freshPos: Record<string, Point> = {};
    const count = tables.length;
    
    tables.forEach((t, idx) => {
      // Sort tables topologically: tables without any foreign keys on left, with FKs on right
      const hasFk = t.schema.columns.some(c => c.foreignKey !== undefined);
      
      const col = hasFk ? 1 : 0;
      const rowIdx = tables.filter(tab => {
        const itemHasFk = tab.schema.columns.some(c => c.foreignKey !== undefined);
        return itemHasFk === hasFk;
      }).indexOf(t);

      const xSpacing = 310;
      const ySpacing = 190;
      
      freshPos[t.name] = {
        x: 40 + col * xSpacing + (idx % 2 === 0 ? 0 : 20),
        y: 40 + rowIdx * ySpacing
      };
    });

    setPositions(freshPos);
  }, [dbState]);

  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    if (e.button !== 0) return; // Left click drag only
    e.preventDefault();
    const pos = positions[tableName] || { x: 0, y: 0 };
    setDraggingTable(tableName);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTable) return;
    e.preventDefault();
    setPositions(prev => ({
      ...prev,
      [draggingTable]: {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      }
    }));
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
  };

  const resetZoomAndLayout = () => {
    setZoom(1);
    const freshPos: Record<string, Point> = {};
    tables.forEach((t, idx) => {
      const hasFk = t.schema.columns.some(c => c.foreignKey !== undefined);
      const col = hasFk ? 1 : 0;
      const rowIdx = tables.filter(tab => {
        const itemHasFk = tab.schema.columns.some(c => c.foreignKey !== undefined);
        return itemHasFk === hasFk;
      }).indexOf(t);

      freshPos[t.name] = {
        x: 40 + col * 310,
        y: 45 + rowIdx * 190
      };
    });
    setPositions(freshPos);
  };

  // Generate connector paths for DB Foreign Keys
  const renderRelations = () => {
    const paths: React.ReactNode[] = [];

    tables.forEach((sourceTable) => {
      sourceTable.schema.columns.forEach((col, colIdx) => {
        if (col.foreignKey) {
          const targetTableName = col.foreignKey.table;
          const targetColName = col.foreignKey.column;

          const sourcePos = positions[sourceTable.name];
          const targetPos = positions[targetTableName];

          if (sourcePos && targetPos) {
            // Cards sizes
            const cardWidth = 240;
            const headerHeight = 36;
            const colHeight = 22;

            // Calculate approximate height of this specific column inside card
            const sourceY = sourcePos.y + headerHeight + (colIdx * colHeight) + (colHeight / 2) + 12;
            
            // Find target column index
            const targetTableObj = dbState.tables[targetTableName];
            const targetColIdx = targetTableObj?.schema.columns.findIndex(c => c.name === targetColName) ?? 0;
            const targetY = targetPos.y + headerHeight + (targetColIdx * colHeight) + (colHeight / 2) + 12;

            // Determine left/right connector anchor attachments
            let sourceAnchorX = sourcePos.x;
            let targetAnchorX = targetPos.x;

            if (sourcePos.x < targetPos.x) {
              // Source card is to the left of the target card
              sourceAnchorX = sourcePos.x + cardWidth;
              targetAnchorX = targetPos.x;
            } else {
              // Source card is to the right of the target card
              sourceAnchorX = sourcePos.x;
              targetAnchorX = targetPos.x + cardWidth;
            }

            // Draw clean cubic bezier path
            const controlPointX1 = sourceAnchorX + (sourcePos.x < targetPos.x ? 50 : -50);
            const controlPointX2 = targetAnchorX + (sourcePos.x < targetPos.x ? -50 : 50);

            const d = `M ${sourceAnchorX} ${sourceY} C ${controlPointX1} ${sourceY}, ${controlPointX2} ${targetY}, ${targetAnchorX} ${targetY}`;

            paths.push(
              <g key={`${sourceTable.name}-${col.name}-${targetTableName}`}>
                {/* Background thicker glow path */}
                <path 
                  d={d} 
                  fill="none" 
                  stroke="#022c22" 
                  strokeWidth="5" 
                  strokeOpacity="0.4"
                />
                {/* Foreground dynamic link line */}
                <path 
                  d={d} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="1.5" 
                  strokeDasharray={draggingTable ? '4 4' : 'none'}
                  markerEnd="url(#arrow)"
                />
                {/* Pivot connection anchor node */}
                <circle cx={sourceAnchorX} cy={sourceY} r="3" fill="#10b981" />
                <circle cx={targetAnchorX} cy={targetY} r="3" fill="#10b981" />
              </g>
            );
          }
        }
      });
    });

    return paths;
  };

  return (
    <div 
      id="diagram-workspace"
      className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden border border-slate-900 rounded select-none p-4 relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Diagram Canvas Controls Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-905 z-10 mb-2">
        <div className="flex items-center gap-2 font-mono">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-350 text-[10px] font-bold uppercase tracking-wider">Dynamic ER Database Diagrammer</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button 
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
            className="p-1 px-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            title="Zoom out canvas"
          >
            <ZoomOut className="w-3.5 h-3.5 inline mr-1" />
            <span>Out</span>
          </button>
          <span className="text-slate-500 w-10 text-center font-bold">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(prev => Math.min(1.4, prev + 0.1))}
            className="p-1 px-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            title="Zoom in canvas"
          >
            <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
            <span>In</span>
          </button>
          <button 
            onClick={resetZoomAndLayout}
            className="p-1 px-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer ml-1"
            title="Fit view"
          >
            <Maximize className="w-3.5 h-3.5 inline mr-1" />
            <span>Fit Canvas</span>
          </button>
        </div>
      </div>

      {/* Main Drag-And-Drop Render Space */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto border border-slate-900/40 rounded bg-slate-925/40"
      >
        {/* Absolute SVG Grid Line Drawing */}
        <div 
          className="w-[2000px] h-[1500px] absolute top-0 left-0"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.1s ease-out' }}
        >
          <svg className="absolute w-full h-full pointer-events-none z-0">
            <defs>
              {/* Pattern grid graph cells */}
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0f172a" strokeWidth="1" />
              </pattern>
              
              {/* Arrow Marker Definitions */}
              <marker 
                id="arrow" 
                viewBox="0 0 10 10" 
                refX="7" 
                refY="5" 
                markerWidth="6" 
                markerHeight="6" 
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {renderRelations()}
          </svg>

          {/* Render Table Cards Nodes */}
          {tables.map((table) => {
            const pos = positions[table.name] || { x: 50, y: 50 };
            const isDraggingThis = draggingTable === table.name;

            return (
              <div 
                key={table.name}
                className={`absolute w-60 bg-slate-900 border rounded shadow-2xl z-20 ${
                  isDraggingThis ? 'border-emerald-500 ring-2 ring-emerald-950/50 cursor-grabbing scale-[1.01]' : 'border-slate-800 hover:border-slate-750 cursor-grab'
                } transition-shadow duration-150 overflow-hidden font-mono text-[11px]`}
                style={{ left: pos.x, top: pos.y }}
              >
                {/* Drag Node Header */}
                <div 
                  onMouseDown={(e) => handleMouseDown(e, table.name)}
                  className="flex items-center justify-between bg-slate-950 border-b border-slate-850 px-3.5 py-2 select-none"
                >
                  <div className="flex items-center gap-1.5 font-bold text-slate-100 truncate">
                    <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{table.name}</span>
                  </div>
                  <span className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded text-slate-500 shrink-0">
                    {table.rows.length} rows
                  </span>
                </div>

                {/* Columns Listing */}
                <div className="px-3.5 py-2.5 space-y-2 select-none">
                  {table.schema.columns.map((col) => (
                    <div key={col.name} className="flex items-center justify-between text-slate-350 pr-0.5">
                      <div className="flex items-center gap-2 truncate">
                        {col.isPrimaryKey ? (
                          <Key className="w-3 h-3 text-yellow-500 shrink-0" title="Primary Key constraint" />
                        ) : col.foreignKey ? (
                          <Link className="w-3 h-3 text-cyan-400 shrink-0" title={`Foreign Key matching: ${col.foreignKey.table}.${col.foreignKey.column}`} />
                        ) : (
                          <span className="w-3 h-3 inline-block shrink-0" />
                        )}
                        <span className={col.isPrimaryKey ? 'font-bold text-yellow-500' : 'text-slate-300'}>{col.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase font-light shrink-0">{col.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Node instructions bar */}
      <div className="z-10 text-[9px] text-slate-500 font-mono mt-1 pt-2 border-t border-slate-905 select-none">
        🧬 Drag the table title headers to space and organize database relationships interactively on screen. Connection paths recalculate in real-time.
      </div>
    </div>
  );
}
