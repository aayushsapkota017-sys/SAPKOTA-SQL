/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'DATETIME';

export interface ColumnDefinition {
  name: string;
  type: DataType;
  notNull: boolean;
  isPrimaryKey: boolean;
  defaultValue: any;
  isUnique: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
}

export type RowData = Record<string, any>;

export interface TableData {
  name: string;
  schema: TableSchema;
  rows: RowData[];
  indexes: string[]; // names of indexed columns
}

export interface DatabaseState {
  version: string;
  tables: Record<string, TableData>;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: RowData[];
  affectedRows: number;
  message?: string;
  executionTimeMs: number;
  astType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER' | 'OTHER';
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'info';
  text: string;
  timestamp: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  handle?: FileSystemFileHandle; // From native showDirectoryPicker
  isDirty?: boolean;
}

export interface WorkspaceDirectory {
  name: string;
  handle?: FileSystemDirectoryHandle;
  files: WorkspaceFile[];
}

export type ActiveTab = 'query' | 'terminal' | 'table-explorer' | 'diagram' | 'file-editor' | 'architecture';
