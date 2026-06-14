/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, TableData, QueryResult, DataType, ColumnDefinition, RowData } from '../types';

/**
 * High-fidelity Virtual SQL Engine (LiteSQL) running entirely Client-Side.
 * Implements Tokenizer, Parser, Constraint Validator, JOIN matcher, Aggregator, and DOT-Commands.
 */

// Simple SQL tokenizer
export function tokenize(sql: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  
  // Strip single-line comments (-- ...) and multi-line comments (/* ... */)
  let cleanSql = sql
    .replace(/--.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');

  while (i < cleanSql.length) {
    const char = cleanSql[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Single quotes (string literals)
    if (char === "'") {
      let literal = "'";
      i++;
      while (i < cleanSql.length) {
        if (cleanSql[i] === "'" && cleanSql[i + 1] === "'") {
          literal += "''"; // Escaped single quote
          i += 2;
        } else if (cleanSql[i] === "'") {
          literal += "'";
          i++;
          break;
        } else {
          literal += cleanSql[i];
          i++;
        }
      }
      tokens.push(literal);
      continue;
    }

    // Double quotes (identifiers)
    if (char === '"' || char === '`') {
      const quoteChar = char;
      let identifier = '';
      i++;
      while (i < cleanSql.length && cleanSql[i] !== quoteChar) {
        identifier += cleanSql[i];
        i++;
      }
      i++; // Skip closing quote
      tokens.push(identifier);
      continue;
    }

    // Operators and symbols
    const twoChars = cleanSql.slice(i, i + 2);
    if (['<=', '>=', '!=', '<>', '=='].includes(twoChars)) {
      tokens.push(twoChars === '<>' ? '!=' : twoChars);
      i += 2;
      continue;
    }

    if (['(', ')', ',', '.', '=', '<', '>', '+', '-', '*', '/', ';'].includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Words / Identifiers / Numbers
    let word = '';
    while (i < cleanSql.length && /[a-zA-Z0-9_$@#%]/.test(cleanSql[i])) {
      word += cleanSql[i];
      i++;
    }

    if (word.length > 0) {
      tokens.push(word);
    } else {
      // Catch any individual unhandled characters
      tokens.push(char);
      i++;
    }
  }

  return tokens;
}

// Split multiple SQL queries separated by semicolons (excluding semicolons inside strings)
export function splitQueries(sql: string): string[] {
  const queries: string[] = [];
  let current = '';
  let inString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      // Check for escaped single quote
      if (inString && sql[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
    }
    
    if (char === ';' && !inString) {
      if (current.trim().length > 0) {
        queries.push(current.trim() + ';');
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim().length > 0) {
    queries.push(current.trim());
  }
  
  return queries;
}

// Low-level helper to safely convert tokens into JS primitives
function parseValue(token: string): any {
  if (token === undefined) return null;
  if (token.toUpperCase() === 'NULL') return null;
  if (token.toUpperCase() === 'TRUE') return true;
  if (token.toUpperCase() === 'FALSE') return false;
  
  // String literal
  if (token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  
  // Number
  if (!isNaN(Number(token))) {
    return Number(token);
  }
  
  return token; // fallback as raw token
}

export class LiteSQLEngine {
  /**
   * Evaluates standard query or DOT commands on the given model state
   */
  public static execute(sql: string, db: DatabaseState): { result: QueryResult; nextDb: DatabaseState } {
    const startTime = performance.now();
    let currentDb = JSON.parse(JSON.stringify(db)) as DatabaseState; // deep clone, transactions isolation
    
    const trimmed = sql.trim();
    if (!trimmed) {
      return {
        result: this.makeEmptyResult('No command entered.', startTime),
        nextDb: currentDb,
      };
    }

    // Handles SQLite DOT commands
    if (trimmed.startsWith('.')) {
      return this.executeDotCommand(trimmed, currentDb, startTime);
    }

    const queries = splitQueries(trimmed);
    let lastResult: QueryResult = this.makeEmptyResult('No queries processed.', startTime);
    
    try {
      for (const query of queries) {
        const tokens = tokenize(query);
        if (tokens.length === 0) continue;
        
        // Remove trailing semicolon if exists
        if (tokens[tokens.length - 1] === ';') {
          tokens.pop();
        }
        
        const action = tokens[0].toUpperCase();
        let queryResult: QueryResult;

        switch (action) {
          case 'CREATE':
            ({ result: queryResult, db: currentDb } = this.handleCreate(tokens, currentDb));
            break;
          case 'INSERT':
            ({ result: queryResult, db: currentDb } = this.handleInsert(tokens, currentDb));
            break;
          case 'SELECT':
            queryResult = this.handleSelect(tokens, currentDb);
            break;
          case 'UPDATE':
            ({ result: queryResult, db: currentDb } = this.handleUpdate(tokens, currentDb));
            break;
          case 'DELETE':
            ({ result: queryResult, db: currentDb } = this.handleDelete(tokens, currentDb));
            break;
          case 'DROP':
            ({ result: queryResult, db: currentDb } = this.handleDrop(tokens, currentDb));
            break;
          case 'ALTER':
            ({ result: queryResult, db: currentDb } = this.handleAlter(tokens, currentDb));
            break;
          default:
            throw new Error(`Unsupported SQL command: "${action}". LiteSQL supports SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, DROP TABLE, ALTER TABLE, or starting terminal commands with dot (e.g. .help).`);
        }
        
        lastResult = queryResult;
      }

      // Add actual execution time
      lastResult.executionTimeMs = Math.max(0.1, parseFloat((performance.now() - startTime).toFixed(2)));
      return { result: lastResult, nextDb: currentDb };
    } catch (err: any) {
      return {
        result: {
          success: false,
          columns: [],
          rows: [],
          affectedRows: 0,
          message: `SQL Error: ${err.message}`,
          executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
          astType: 'OTHER'
        },
        nextDb: db, // rollback state on exception
      };
    }
  }

  private static makeEmptyResult(message: string, startTime: number): QueryResult {
    return {
      success: true,
      columns: [],
      rows: [],
      affectedRows: 0,
      message,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
    };
  }

  /**
   * Handle sqlite CLI dot commands
   */
  private static executeDotCommand(command: string, db: DatabaseState, startTime: number): { result: QueryResult; nextDb: DatabaseState } {
    const parts = command.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    
    const result: QueryResult = {
      success: true,
      columns: ['Command Output'],
      rows: [],
      affectedRows: 0,
      executionTimeMs: 0,
      astType: 'OTHER'
    };

    switch (cmd) {
      case '.help':
        result.columns = ['Dot Command', 'Description', 'Syntax Example'];
        result.rows = [
          { 'Dot Command': '.help', 'Description': 'Show list of available commands and instructions.', 'Syntax Example': '.help' },
          { 'Dot Command': '.tables', 'Description': 'List out the names of all active tables in the virtual schema.', 'Syntax Example': '.tables' },
          { 'Dot Command': '.schema [table]', 'Description': 'Print out columns configuration for the specified tables.', 'Syntax Example': '.schema users' },
          { 'Dot Command': '.databases', 'Description': 'List loaded sandbox SQLite databases.', 'Syntax Example': '.databases' },
          { 'Dot Command': '.dump [table]', 'Description': 'Generates ready-to-run ANSI-SQL statements (DDL + Inserts).', 'Syntax Example': '.dump product' },
          { 'Dot Command': '.read [file]', 'Description': 'Execute lines inside local relative workspace files.', 'Syntax Example': '.read schema.sql' }
        ];
        result.message = 'LiteSQL Core dot commands loaded.';
        break;

      case '.tables':
        const names = Object.keys(db.tables);
        result.columns = ['Table Names'];
        result.rows = names.map(name => ({ 'Table Names': name }));
        result.message = names.length === 0 ? 'No virtual tables found in the database.' : `Loaded ${names.length} table(s).`;
        break;

      case '.databases':
        result.columns = ['seq', 'name', 'file', 'type'];
        result.rows = [
          { seq: 0, name: 'main', file: 'In-Memory Context (localStore)', type: 'r/w' }
        ];
        result.message = 'Virtual SQLite sandbox databases listed.';
        break;

      case '.schema':
        const tableName = parts[1];
        result.columns = ['Table Schema JSON Representation'];
        if (tableName) {
          const t = db.tables[tableName];
          if (!t) throw new Error(`Table "${tableName}" does not exist.`);
          result.rows = [{
            'Table Schema JSON Representation': `CREATE TABLE ${t.name} (\n` + 
              t.schema.columns.map(c => `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${c.isUnique ? ' UNIQUE' : ''}${c.defaultValue !== null ? ` DEFAULT ${typeof c.defaultValue === 'string' ? `'${c.defaultValue}'` : c.defaultValue}` : ''}${c.foreignKey ? ` REFERENCES ${c.foreignKey.table}(${c.foreignKey.column})` : ''}`).join(',\n') +
              `\n);`
          }];
        } else {
          result.rows = Object.values(db.tables).map(t => ({
            'Table Schema JSON Representation': `CREATE TABLE ${t.name} (\n` + 
              t.schema.columns.map(c => `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${c.isUnique ? ' UNIQUE' : ''}${c.defaultValue !== null ? ` DEFAULT ${typeof c.defaultValue === 'string' ? `'${c.defaultValue}'` : c.defaultValue}` : ''}${c.foreignKey ? ` REFERENCES ${c.foreignKey.table}(${c.foreignKey.column})` : ''}`).join(',\n') +
              `\n);\n`
          }));
        }
        break;

      case '.dump':
        const dTable = parts[1];
        result.columns = ['SQL Seed Script'];
        
        let dumpStatements: string[] = [];
        const tablesToDump = dTable ? [db.tables[dTable]].filter(Boolean) : Object.values(db.tables);
        
        if (tablesToDump.length === 0) {
          result.rows = [{ 'SQL Seed Script': '-- No virtual databases tables created yet.' }];
        } else {
          for (const t of tablesToDump) {
            let ddl = `CREATE TABLE IF NOT EXISTS ${t.name} (\n` + 
              t.schema.columns.map(c => `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${c.defaultValue !== null ? ` DEFAULT ${typeof c.defaultValue === 'string' ? `'${c.defaultValue}'` : c.defaultValue}` : ''}`).join(',\n') +
              `\n);`;
            dumpStatements.push(ddl);
            
            for (const r of t.rows) {
              const cols = Object.keys(r).join(', ');
              const vals = Object.values(r).map(v => {
                if (v === null) return 'NULL';
                if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                return v;
              }).join(', ');
              dumpStatements.push(`INSERT INTO ${t.name} (${cols}) VALUES (${vals});`);
            }
          }
          result.rows = dumpStatements.map(stmt => ({ 'SQL Seed Script': stmt }));
        }
        result.message = 'ANSI-SQL commands created.';
        break;

      default:
        throw new Error(`Unknown Dot Command syntax "${cmd}". Input '.help' for all active commands.`);
    }

    result.executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    return { result, nextDb: db };
  }

  /**
   * Handle CREATE TABLE
   */
  private static handleCreate(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // Expected: CREATE TABLE [IF NOT EXISTS] tableName ( col1 type [attrs], col2 type, ... )
    if (tokens[1].toUpperCase() !== 'TABLE') {
      throw new Error("Only structures matching 'CREATE TABLE' are fully processed right now.");
    }
    
    let offset = 2;
    let ifNotExists = false;
    if (tokens[offset].toUpperCase() === 'IF' && tokens[offset + 1].toUpperCase() === 'NOT' && tokens[offset + 2].toUpperCase() === 'EXISTS') {
      ifNotExists = true;
      offset += 3;
    }

    const tableName = tokens[offset];
    if (!tableName || tableName === '(') {
      throw new Error("Syntax error: Table name required after 'CREATE TABLE'.");
    }

    offset++;
    if (tokens[offset] !== '(') {
      throw new Error(`Syntax error: Opening brace '(' required, found "${tokens[offset]}".`);
    }

    if (db.tables[tableName] && ifNotExists) {
      return {
        result: {
          success: true,
          columns: [],
          rows: [],
          affectedRows: 0,
          message: `Table "${tableName}" already exists. Skipping.`,
          executionTimeMs: 0,
          astType: 'CREATE'
        },
        db
      };
    }

    if (db.tables[tableName]) {
      throw new Error(`Table "${tableName}" already exists in the current database schema.`);
    }

    // Capture bracket elements and parse column listings
    const columnTokens: string[][] = [];
    let curCol: string[] = [];
    let braceDepth = 1;

    for (let j = offset + 1; j < tokens.length; j++) {
      const tok = tokens[j];
      if (tok === '(') {
        braceDepth++;
        curCol.push(tok);
      } else if (tok === ')') {
        braceDepth--;
        if (braceDepth === 0) {
          if (curCol.length > 0) columnTokens.push(curCol);
          break;
        } else {
          curCol.push(tok);
        }
      } else if (tok === ',' && braceDepth === 1) {
        if (curCol.length > 0) columnTokens.push(curCol);
        curCol = [];
      } else {
        curCol.push(tok);
      }
    }

    const columns: ColumnDefinition[] = [];
    
    for (const cols of columnTokens) {
      if (cols.length === 0) continue;
      
      // Look for inline structural FOREIGN KEY declaration vs standard table constraint rules
      if (cols[0].toUpperCase() === 'FOREIGN' && cols[1].toUpperCase() === 'KEY') {
        // e.g. FOREIGN KEY (user_id) REFERENCES users(id)
        const localCol = cols[3]; // format: FOREIGN KEY ( user_id ) REFERENCES users ( id )
        const refTable = cols[6];
        const refCol = cols[8];
        const existing = columns.find(c => c.name.toLowerCase() === localCol.toLowerCase());
        if (existing) {
          existing.foreignKey = { table: refTable, column: refCol };
        }
        continue;
      }

      const colName = cols[0];
      let colType = (cols[1] || 'TEXT').toUpperCase() as DataType;
      
      // Sanitize standard custom variants mapping to standard SQLite column types
      if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'NUMERIC'].includes(colType)) colType = 'INTEGER';
      if (['VARCHAR', 'CHAR', 'STRING', 'NVARCHAR'].includes(colType)) colType = 'TEXT';
      if (['DECIMAL', 'FLOAT', 'DOUBLE'].includes(colType)) colType = 'REAL';

      let isPrimaryKey = false;
      let notNull = false;
      let isUnique = false;
      let defaultValueKey: any = null;
      let foreignKey: any = undefined;

      for (let k = 2; k < cols.length; k++) {
        const item = cols[k].toUpperCase();
        if (item === 'PRIMARY' && cols[k + 1]?.toUpperCase() === 'KEY') {
          isPrimaryKey = true;
          k++;
        } else if (item === 'NOT' && cols[k + 1]?.toUpperCase() === 'NULL') {
          notNull = true;
          k++;
        } else if (item === 'UNIQUE') {
          isUnique = true;
        } else if (item === 'DEFAULT') {
          defaultValueKey = parseValue(cols[k + 1]);
          k++;
        } else if (item === 'REFERENCES') {
          const fTable = cols[k + 1];
          const fCol = cols[k + 3]; // standard REFERENCE table (colName)
          foreignKey = { table: fTable, column: fCol };
          k += 4;
        }
      }

      columns.push({
        name: colName,
        type: colType,
        isPrimaryKey,
        notNull,
        isUnique,
        defaultValue: defaultValueKey,
        foreignKey
      });
    }

    db.tables[tableName] = {
      name: tableName,
      schema: { name: tableName, columns },
      rows: [],
      indexes: columns.filter(c => c.isPrimaryKey || c.isUnique).map(c => c.name)
    };

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: 1,
        message: `Table "${tableName}" created successfully.`,
        executionTimeMs: 0,
        astType: 'CREATE'
      },
      db
    };
  }

  /**
   * Handle INSERT INTO
   */
  private static handleInsert(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // INSERT INTO tableName [(col1, col2...)] VALUES (val1, val2...), (val3, val4...)
    let word = tokens[1].toUpperCase();
    if (word !== 'INTO') {
      throw new Error(`Syntax error: INSERT must be followed by 'INTO'. Found "${tokens[1]}"`);
    }

    const tableName = tokens[2];
    const table = db.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" has not been created in this database.`);
    }

    let colNames: string[] = [];
    let valuesOffset = 3;

    if (tokens[3] === '(') {
      let j = 4;
      while (j < tokens.length && tokens[j] !== ')') {
        if (tokens[j] !== ',') {
          colNames.push(tokens[j]);
        }
        j++;
      }
      valuesOffset = j + 1;
    } else {
      // DEFAULT: Match columns list from schemas
      colNames = table.schema.columns.map(c => c.name);
    }

    if (tokens[valuesOffset]?.toUpperCase() !== 'VALUES') {
      throw new Error(`Syntax error: expected keyword VALUES, found "${tokens[valuesOffset]}"`);
    }

    let i = valuesOffset + 1;
    let recordsInserted = 0;

    while (i < tokens.length) {
      if (tokens[i] !== '(') {
        throw new Error(`Syntax error: expected row values enclosed in parenthesis '(', found "${tokens[i]}".`);
      }
      
      const insertVals: any[] = [];
      i++;
      while (i < tokens.length && tokens[i] !== ')') {
        if (tokens[i] !== ',') {
          insertVals.push(parseValue(tokens[i]));
        }
        i++;
      }

      // Safe bounds validation
      if (insertVals.length !== colNames.length) {
        throw new Error(`Insertion dimension mismatch: table features ${colNames.length} columns, but inserting row with ${insertVals.length} value variables.`);
      }

      const newRow: RowData = {};
      
      // Pre-fill everything with defaults from the schema
      for (const colDef of table.schema.columns) {
        newRow[colDef.name] = colDef.defaultValue;
      }

      // Apply explicitly inserted mapping values
      for (let idx = 0; idx < colNames.length; idx++) {
        const key = colNames[idx];
        const val = insertVals[idx];
        newRow[key] = val;
      }

      // Check NOT NULL, UNIQUE, and PRIMARY KEY constraints
      for (const colDef of table.schema.columns) {
        const val = newRow[colDef.name];
        
        // NULL checks
        if (colDef.notNull && val === null) {
          throw new Error(`Constraint failure: column "${colDef.name}" inside table "${tableName}" cannot hold NULL values.`);
        }

        // PRIMARY KEY and UNIQUE integrity triggers
        if (colDef.isPrimaryKey || colDef.isUnique) {
          const duplicate = table.rows.find(r => r[colDef.name] === val && val !== null);
          if (duplicate) {
            throw new Error(`Constraint failure: integrity UNIQUE conflict on key "${colDef.name}" inside table "${tableName}". Value "${val}" already exists.`);
          }
        }

        // FOREIGN KEY integrity constraints
        if (colDef.foreignKey) {
          const parentTable = db.tables[colDef.foreignKey.table];
          if (!parentTable) {
            throw new Error(`FOREIGN KEY constraint error: Parent table "${colDef.foreignKey.table}" does not exist.`);
          }
          const parentValue = val;
          if (parentValue !== null) {
            const hasMatch = parentTable.rows.some(r => r[colDef.foreignKey!.column] === parentValue);
            if (!hasMatch) {
              throw new Error(`FOREIGN KEY Constraint Failed: Row inserts invalid reference on "${tableName}.${colDef.name}" (${parentValue}) to parent table "${parentTable.name}.${colDef.foreignKey!.column}".`);
            }
          }
        }
      }

      table.rows.push(newRow);
      recordsInserted++;
      i++; // skip ')'
      
      if (tokens[i] === ',') {
        i++; // parse subsequent listings if items are chained
      } else {
        break;
      }
    }

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: recordsInserted,
        message: `Query OK, inserted ${recordsInserted} record(s) into database table "${tableName}".`,
        executionTimeMs: 0,
        astType: 'INSERT'
      },
      db
    };
  }

  /**
   * Handle SELECT with Joins, Filtering, Limit, Offsets and Aggregations
   */
  private static handleSelect(tokens: string[], db: DatabaseState): QueryResult {
    // Simplified Select Parser Syntax Compiler:
    // SELECT [DISTINCT] [cols] FROM [table] [JOIN tables ON cond] [WHERE cond] [GROUP BY cols] [ORDER BY cols] [LIMIT n] [OFFSET n]
    let isDistinct = false;
    let offset = 1;
    if (tokens[1]?.toUpperCase() === 'DISTINCT') {
      isDistinct = true;
      offset = 2;
    }

    // 1. Gather Select Columns Array prior to FROM keyword
    const selectArgs: string[] = [];
    let fromIdx = -1;
    
    for (let k = offset; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'FROM') {
        fromIdx = k;
        break;
      }
      if (tokens[k] !== ',') {
        selectArgs.push(tokens[k]);
      }
    }

    if (fromIdx === -1) {
      // SELECT statement without FROM (e.g. SELECT 1+1 or SELECT sqlite_version())
      return this.handleStaticSelect(selectArgs);
    }

    const sourceTable = tokens[fromIdx + 1];
    const mainTable = db.tables[sourceTable];
    if (!mainTable) {
      throw new Error(`Table "${sourceTable}" does not exist in the active schema database.`);
    }

    // 2. Resolve Joins
    let curIdx = fromIdx + 2;
    let virtualDataSet: RowData[] = JSON.parse(JSON.stringify(mainTable.rows)); // working records copy
    
    while (curIdx < tokens.length) {
      const tokenUpper = tokens[curIdx].toUpperCase();
      
      if (['JOIN', 'LEFT', 'INNER'].includes(tokenUpper)) {
        let isLeft = tokenUpper === 'LEFT';
        let step = 1;
        if (tokens[curIdx + 1]?.toUpperCase() === 'JOIN') {
          step = 2;
        } else if (tokenUpper === 'INNER' && tokens[curIdx + 1]?.toUpperCase() === 'JOIN') {
          step = 2;
        }

        const joinTable = tokens[curIdx + step];
        const joinTableData = db.tables[joinTable];
        if (!joinTableData) {
          throw new Error(`JOIN Error: table "${joinTable}" is not declared inside database.`);
        }

        const onToken = tokens[curIdx + step + 1];
        if (onToken?.toUpperCase() !== 'ON') {
          throw new Error(`Syntax error: JOIN clauses must specify the 'ON' match key condition.`);
        }

        const lhsKey = tokens[curIdx + step + 2]; // e.g. main.id or main_key
        const op = tokens[curIdx + step + 3];     // e.g. =
        const rhsKey = tokens[curIdx + step + 4]; // e.g. join_tab.user_id

        if (op !== '=') {
          throw new Error(`Join constraint operation support standard equality '=' matching.`);
        }

        // Perform active relational Cartesian Product merge
        const mergedRows: RowData[] = [];
        
        // Helper to retrieve values from keys that might have table prefixes (e.g., source.id)
        const getColumnCleanName = (key: string) => {
          if (key.includes('.')) return key.split('.')[1];
          return key;
        };

        const lhsClean = getColumnCleanName(lhsKey);
        const rhsClean = getColumnCleanName(rhsKey);

        for (const mainRow of virtualDataSet) {
          let hasMatch = false;

          for (const joinRow of joinTableData.rows) {
            // Check if join matches
            const mainVal = mainRow[lhsClean] !== undefined ? mainRow[lhsClean] : mainRow[lhsKey];
            const joinVal = joinRow[rhsClean] !== undefined ? joinRow[rhsClean] : joinRow[rhsKey];

            if (mainVal !== undefined && joinVal !== undefined && mainVal === joinVal) {
              mergedRows.push({ ...mainRow, ...joinRow });
              hasMatch = true;
            }
          }

          if (isLeft && !hasMatch) {
            // Null-pad out columns of missing records from Join Table
            const nullRow: RowData = { ...mainRow };
            for (const col of joinTableData.schema.columns) {
              if (nullRow[col.name] === undefined) {
                nullRow[col.name] = null;
              }
            }
            mergedRows.push(nullRow);
          }
        }

        virtualDataSet = mergedRows;
        curIdx += step + 5;
      } else {
        break;
      }
    }

    // 3. Resolve WHERE constraints
    let whereIdx = -1;
    for (let k = fromIdx; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'WHERE') {
        whereIdx = k;
        break;
      }
    }

    if (whereIdx !== -1) {
      // Gather tokens inside WHERE scope up till next SQL keyword
      const whereTokens: string[] = [];
      const terminators = ['GROUP', 'ORDER', 'LIMIT', 'OFFSET'];
      
      let j = whereIdx + 1;
      while (j < tokens.length) {
        if (terminators.includes(tokens[j].toUpperCase())) break;
        if (tokens[j].toUpperCase() === 'GROUP' && tokens[j + 1]?.toUpperCase() === 'BY') break;
        if (tokens[j].toUpperCase() === 'ORDER' && tokens[j + 1]?.toUpperCase() === 'BY') break;
        whereTokens.push(tokens[j]);
        j++;
      }

      virtualDataSet = virtualDataSet.filter(row => this.evaluateWhereClause(row, whereTokens));
    }

    // 4. Resolve Aggregate Functions & Columns Formatting
    // e.g. select user, count(*), sum(amount) from orders
    let hasAggregates = false;
    const resolvedColumns: string[] = [];
    const formattedSelectArgs: { name: string; isAgg?: boolean; aggFunc?: string; aggTarget?: string }[] = [];

    // Parse the select args
    let idx = 0;
    while (idx < selectArgs.length) {
      const arg = selectArgs[idx];
      const argUpper = arg.toUpperCase();

      if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(argUpper)) {
        hasAggregates = true;
        const openBrace = selectArgs[idx + 1];
        const targetcol = selectArgs[idx + 2];
        const closeBrace = selectArgs[idx + 3];

        if (openBrace !== '(' || !targetcol || closeBrace !== ')') {
          throw new Error(`Aggregation function syntax error on ${argUpper}`);
        }

        const name = `${argUpper}(${targetcol})`;
        resolvedColumns.push(name);
        formattedSelectArgs.push({ name, isAgg: true, aggFunc: argUpper, aggTarget: targetcol });
        idx += 4;
      } else if (arg === '*') {
        // Expand wildcards
        const allCols: string[] = [];
        // Add columns from source tables
        mainTable.schema.columns.forEach(c => allCols.push(c.name));
        // Add we had any joins, add theirs too
        resolvedColumns.push(...allCols);
        allCols.forEach(col => formattedSelectArgs.push({ name: col }));
        idx++;
      } else {
        // Simple column or table.column
        let cleanName = arg;
        if (arg.includes('.')) {
          cleanName = arg.split('.')[1];
        }
        resolvedColumns.push(cleanName);
        formattedSelectArgs.push({ name: cleanName });
        idx++;
      }
    }

    // 5. Handle GROUP BY matching
    let groupByIdx = -1;
    for (let k = fromIdx; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'GROUP' && tokens[k + 1]?.toUpperCase() === 'BY') {
        groupByIdx = k;
        break;
      }
    }

    let finalRows: RowData[] = [];

    if (hasAggregates) {
      if (groupByIdx !== -1) {
        const groupCol = tokens[groupByIdx + 2];
        const groupedBuckets: Record<string, RowData[]> = {};

        for (const row of virtualDataSet) {
          const key = String(row[groupCol] || 'NULL');
          if (!groupedBuckets[key]) groupedBuckets[key] = [];
          groupedBuckets[key].push(row);
        }

        for (const bucketKey of Object.keys(groupedBuckets)) {
          const groupRows = groupedBuckets[bucketKey];
          const aggregatedRow: RowData = {};

          // Inject standard matching values
          for (const arg of formattedSelectArgs) {
            if (arg.isAgg) {
              aggregatedRow[arg.name] = this.runAggregation(groupRows, arg.aggFunc!, arg.aggTarget!);
            } else {
              aggregatedRow[arg.name] = groupRows[0][arg.name] ?? null;
            }
          }
          finalRows.push(aggregatedRow);
        }
      } else {
        // Global Single Bucket
        const aggregatedRow: RowData = {};
        for (const arg of formattedSelectArgs) {
          if (arg.isAgg) {
            aggregatedRow[arg.name] = this.runAggregation(virtualDataSet, arg.aggFunc!, arg.aggTarget!);
          } else {
            aggregatedRow[arg.name] = virtualDataSet[0]?.[arg.name] ?? null;
          }
        }
        finalRows.push(aggregatedRow);
      }
    } else {
      // Map columns directly
      for (const row of virtualDataSet) {
        const mappedRow: RowData = {};
        for (const colName of resolvedColumns) {
          mappedRow[colName] = row[colName] !== undefined ? row[colName] : null;
        }
        finalRows.push(mappedRow);
      }
    }

    // 6. Handle DISTINCT
    if (isDistinct) {
      const seen = new Set<string>();
      finalRows = finalRows.filter(row => {
        const str = JSON.stringify(row);
        if (seen.has(str)) return false;
        seen.add(str);
        return true;
      });
    }

    // 7. Resolve ORDER BY sorting
    let orderIdx = -1;
    for (let k = fromIdx; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'ORDER' && tokens[k + 1]?.toUpperCase() === 'BY') {
        orderIdx = k;
        break;
      }
    }

    if (orderIdx !== -1) {
      const orderColumn = tokens[orderIdx + 2];
      const directionToken = tokens[orderIdx + 3]?.toUpperCase();
      const desc = directionToken === 'DESC';

      finalRows.sort((a, b) => {
        const aVal = a[orderColumn];
        const bVal = b[orderColumn];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return desc ? bVal - aVal : aVal - bVal;
        }

        return desc 
          ? String(bVal).localeCompare(String(aVal)) 
          : String(aVal).localeCompare(String(bVal));
      });
    }

    // 8. Resolve LIMIT and OFFSET triggers
    let limitValue: number | null = null;
    let offsetValue = 0;

    for (let k = fromIdx; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'LIMIT') {
        limitValue = Number(tokens[k + 1]);
      }
      if (tokens[k].toUpperCase() === 'OFFSET') {
        offsetValue = Number(tokens[k + 1]);
      }
    }

    if (limitValue !== null || offsetValue > 0) {
      const end = limitValue !== null ? offsetValue + limitValue : finalRows.length;
      finalRows = finalRows.slice(offsetValue, end);
    }

    return {
      success: true,
      columns: resolvedColumns.length > 0 ? resolvedColumns : (finalRows[0] ? Object.keys(finalRows[0]) : []),
      rows: finalRows,
      affectedRows: finalRows.length,
      executionTimeMs: 0,
      astType: 'SELECT'
    };
  }

  private static evaluateWhereClause(row: RowData, tokens: string[]): boolean {
    if (tokens.length === 0) return true;

    // Split compound OR blocks
    const orClauses: string[][] = [];
    let curClause: string[] = [];
    let parenDepth = 0;

    for (const token of tokens) {
      const tokenUpper = token.toUpperCase();
      if (token === '(') parenDepth++;
      if (token === ')') parenDepth--;
      
      if (tokenUpper === 'OR' && parenDepth === 0) {
        orClauses.push(curClause);
        curClause = [];
      } else {
        curClause.push(token);
      }
    }
    orClauses.push(curClause);

    if (orClauses.length > 1) {
      return orClauses.some(subTokens => this.evaluateWhereClause(row, subTokens));
    }

    // Split compound AND blocks
    const andClauses: string[][] = [];
    curClause = [];
    parenDepth = 0;

    for (const token of tokens) {
      const tokenUpper = token.toUpperCase();
      if (token === '(') parenDepth++;
      if (token === ')') parenDepth--;

      if (tokenUpper === 'AND' && parenDepth === 0) {
        andClauses.push(curClause);
        curClause = [];
      } else {
        curClause.push(token);
      }
    }
    andClauses.push(curClause);

    if (andClauses.length > 1) {
      return andClauses.every(subTokens => this.evaluateWhereClause(row, subTokens));
    }

    // Handle single logical condition
    const t = tokens.map(tok => tok.trim()).filter(Boolean);
    if (t.length === 0) return true;

    // Handle parentheses
    if (t[0] === '(' && t[t.length - 1] === ')') {
      return this.evaluateWhereClause(row, t.slice(1, -1));
    }

    const lhs = t[0];
    const op = t[1]?.toUpperCase();

    const rowVal = row[lhs];
    
    // IS NULL and IS NOT NULL bounds
    if (op === 'IS' && t[2]?.toUpperCase() === 'NULL') {
      return rowVal === null || rowVal === undefined;
    }
    if (op === 'IS' && t[2]?.toUpperCase() === 'NOT' && t[3]?.toUpperCase() === 'NULL') {
      return rowVal !== null && rowVal !== undefined;
    }

    const rawRhs = t[2];
    const rhs = parseValue(rawRhs);

    switch (op) {
      case '=':
      case '==':
        return String(rowVal) === String(rhs);
      case '!=':
      case '<>':
        return String(rowVal) !== String(rhs);
      case '>':
        return Number(rowVal) > Number(rhs);
      case '<':
        return Number(rowVal) < Number(rhs);
      case '>=':
        return Number(rowVal) >= Number(rhs);
      case '<=':
        return Number(rowVal) <= Number(rhs);
      case 'LIKE':
        if (rowVal === null || rowVal === undefined) return false;
        // Turn SQLite LIKE wildcard % into js regex
        const pattern = String(rhs)
          .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // escape special regex elements
          .replace(/%/g, '.*')
          .replace(/_/g, '.');
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(String(rowVal));
      default:
        return true; // Ignore matching syntax failures gracefully
    }
  }

  private static runAggregation(rows: RowData[], func: string, targetCol: string): any {
    if (rows.length === 0) return func === 'COUNT' ? 0 : null;

    if (func === 'COUNT') {
      if (targetCol === '*') return rows.length;
      return rows.filter(r => r[targetCol] !== null && r[targetCol] !== undefined).length;
    }

    // Extract valid numeric properties
    const nums = rows
      .map(r => Number(r[targetCol]))
      .filter(n => !isNaN(n) && n !== null && n !== undefined);

    if (nums.length === 0) return null;

    switch (func) {
      case 'SUM':
        return nums.reduce((acc, curr) => acc + curr, 0);
      case 'AVG':
        return nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
      case 'MIN':
        return Math.min(...nums);
      case 'MAX':
        return Math.max(...nums);
      default:
        return null;
    }
  }

  private static handleStaticSelect(selectArgs: string[]): QueryResult {
    // Parser for "SELECT 1 + 1" or "SELECT 'sqlite_offline'"
    const colName = selectArgs.join(' ');
    let calculatedVal: any = colName;
    
    // Evaluation mechanics
    if (selectArgs[0] === '1' && selectArgs[1] === '+' && selectArgs[2] === '1') {
      calculatedVal = 2;
    } else if (colName.includes('version()') || colName.toUpperCase().includes('SQLITE_VERSION()')) {
      calculatedVal = '3.45.0 (LiteSQL Engine)';
    } else {
      calculatedVal = parseValue(selectArgs[0]);
    }

    return {
      success: true,
      columns: [colName],
      rows: [{ [colName]: calculatedVal }],
      affectedRows: 1,
      executionTimeMs: 0,
      astType: 'SELECT'
    };
  }

  /**
   * Handle UPDATE
   */
  private static handleUpdate(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // UPDATE tableName SET col1 = val1, col2 = val2 [WHERE cond]
    const tableName = tokens[1];
    const table = db.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist in schema.`);
    }

    let setIdx = -1;
    for (let k = 2; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'SET') {
        setIdx = k;
        break;
      }
    }

    if (setIdx === -1) {
      throw new Error(`Syntax error: UPDATE commands require keyword "SET".`);
    }

    // Find WHERE boundary
    let whereIdx = -1;
    for (let k = setIdx; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'WHERE') {
        whereIdx = k;
        break;
      }
    }

    const setEndIndex = whereIdx !== -1 ? whereIdx : tokens.length;
    const assignments: { key: string; value: any }[] = [];
    
    let j = setIdx + 1;
    while (j < setEndIndex) {
      const key = tokens[j];
      const op = tokens[j + 1];
      const valToken = tokens[j + 2];

      if (op !== '=') {
        throw new Error(`Syntax error in UPDATE assignments matching columns.`);
      }

      assignments.push({ key, value: parseValue(valToken) });
      j += 3;
      if (tokens[j] === ',') j++;
    }

    // Load filter constraint
    const whereTokens = whereIdx !== -1 ? tokens.slice(whereIdx + 1) : [];
    
    let updatedCount = 0;
    for (const row of table.rows) {
      if (this.evaluateWhereClause(row, whereTokens)) {
        // Enforce DB schema updates constraints
        for (const update of assignments) {
          const colDef = table.schema.columns.find(c => c.name === update.key);
          if (colDef) {
            // Null constraint check
            if (colDef.notNull && update.value === null) {
              throw new Error(`Constraint Failed: "${update.key}" cannot contain NULL values.`);
            }
            
            // Unique index check
            if (colDef.isPrimaryKey || colDef.isUnique) {
              const other = table.rows.find(r => r !== row && r[colDef.name] === update.value);
              if (other) {
                throw new Error(`Constraint failure: integrity UNIQUE conflict on key "${colDef.name}".`);
              }
            }

            // FOREIGN KEY checks
            if (colDef.foreignKey && update.value !== null) {
              const parentTable = db.tables[colDef.foreignKey.table];
              if (parentTable) {
                const matchExists = parentTable.rows.some(r => r[colDef.foreignKey!.column] === update.value);
                if (!matchExists) {
                  throw new Error(`FOREIGN KEY Constraint Failed: Referenced table entry missing dependency on value "${update.value}".`);
                }
              }
            }

            row[update.key] = update.value;
          }
        }
        updatedCount++;
      }
    }

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: updatedCount,
        message: `Query OK, updated ${updatedCount} rows inside "${tableName}".`,
        executionTimeMs: 0,
        astType: 'UPDATE'
      },
      db
    };
  }

  /**
   * Handle DELETE FROM
   */
  private static handleDelete(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // DELETE FROM tableName [WHERE cond]
    let offset = 1;
    if (tokens[1].toUpperCase() === 'FROM') {
      offset = 2;
    }
    
    const tableName = tokens[offset];
    const table = db.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist in schema.`);
    }

    let whereIdx = -1;
    for (let k = offset + 1; k < tokens.length; k++) {
      if (tokens[k].toUpperCase() === 'WHERE') {
        whereIdx = k;
        break;
      }
    }

    const whereTokens = whereIdx !== -1 ? tokens.slice(whereIdx + 1) : [];
    
    // Check cascade foreign key locks from child tables
    const childTables = Object.values(db.tables).filter(t => 
      t.schema.columns.some(c => c.foreignKey?.table === tableName)
    );

    const initialCount = table.rows.length;
    
    // Filter matching elements out
    const rowsToDelete = table.rows.filter(row => this.evaluateWhereClause(row, whereTokens));
    
    for (const deleteRow of rowsToDelete) {
      // Validate active foreign keys
      for (const childTable of childTables) {
        const matchingCol = childTable.schema.columns.find(c => c.foreignKey?.table === tableName);
        if (matchingCol) {
          const referencedKeyVal = deleteRow[matchingCol.foreignKey!.column];
          if (referencedKeyVal !== undefined && referencedKeyVal !== null) {
            const blockMatch = childTable.rows.some(r => r[matchingCol.name] === referencedKeyVal);
            if (blockMatch) {
              throw new Error(`FOREIGN KEY Conflict: delete failed because child table "${childTable.name}" has references to row values on key Column "${matchingCol.name}".`);
            }
          }
        }
      }
    }

    table.rows = table.rows.filter(row => !this.evaluateWhereClause(row, whereTokens));
    const deletedCount = initialCount - table.rows.length;

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: deletedCount,
        message: `Query OK, deleted ${deletedCount} item record(s) from "${tableName}".`,
        executionTimeMs: 0,
        astType: 'DELETE'
      },
      db
    };
  }

  /**
   * Handle DROP TABLE
   */
  private static handleDrop(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // DROP TABLE [IF EXISTS] tableName
    if (tokens[1].toUpperCase() !== 'TABLE') {
      throw new Error(`Unsupported schema command DROP "${tokens[1]}"`);
    }

    let offset = 2;
    let ifExists = false;
    if (tokens[2].toUpperCase() === 'IF' && tokens[3].toUpperCase() === 'EXISTS') {
      ifExists = true;
      offset = 4;
    }

    const tableName = tokens[offset];
    
    if (!db.tables[tableName]) {
      if (ifExists) {
        return {
          result: {
            success: true,
            columns: [],
            rows: [],
            affectedRows: 0,
            message: `Table "${tableName}" does not exist. Skipping.`,
            executionTimeMs: 0,
            astType: 'DROP'
          },
          db
        };
      }
      throw new Error(`Table schema "${tableName}" is missing.`);
    }

    delete db.tables[tableName];

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: 1,
        message: `Table "${tableName}" cleanly dropped from database schemas.`,
        executionTimeMs: 0,
        astType: 'DROP'
      },
      db
    };
  }

  /**
   * Handle ALTER TABLE
   */
  private static handleAlter(tokens: string[], db: DatabaseState): { result: QueryResult; db: DatabaseState } {
    // ALTER TABLE table ADD COLUMN col type
    if (tokens[1].toUpperCase() !== 'TABLE') {
      throw new Error("Syntax error: expected ALTER TABLE");
    }

    const tableName = tokens[2];
    const table = db.tables[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist in schema.`);
    }

    if (tokens[3].toUpperCase() !== 'ADD' || tokens[4].toUpperCase() !== 'COLUMN') {
      throw new Error('LiteSQL only supports "ALTER TABLE table ADD COLUMN column_name type" for schema extensions.');
    }

    const columnName = tokens[5];
    const columnType = (tokens[6] || 'TEXT').toUpperCase() as DataType;

    // Check if column already exists
    if (table.schema.columns.some(c => c.name.toLowerCase() === columnName.toLowerCase())) {
      throw new Error(`Column "${columnName}" already exists in table "${tableName}".`);
    }

    table.schema.columns.push({
      name: columnName,
      type: columnType,
      notNull: false,
      isPrimaryKey: false,
      defaultValue: null,
      isUnique: false
    });

    // Populate existing records with defaults (null)
    for (const r of table.rows) {
      r[columnName] = null;
    }

    return {
      result: {
        success: true,
        columns: [],
        rows: [],
        affectedRows: 1,
        message: `Column "${columnName}" successfully appended to layout table "${tableName}".`,
        executionTimeMs: 0,
        astType: 'ALTER'
      },
      db
    };
  }

  /**
   * Load Default Sample Workload Datasets
   */
  public static loadSampleSchema(name: 'chinook' | 'project' | 'iot'): DatabaseState {
    const freshDb: DatabaseState = {
      version: '1.0.0',
      tables: {}
    };

    if (name === 'chinook') {
      // 1. Genres
      freshDb.tables['genres'] = {
        name: 'genres',
        schema: {
          name: 'genres',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'name', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null }
          ]
        },
        rows: [
          { id: 1, name: 'Rock' },
          { id: 2, name: 'Jazz' },
          { id: 3, name: 'Metal' },
          { id: 4, name: 'Classical' },
          { id: 5, name: 'Pop' }
        ],
        indexes: ['id']
      };

      // 2. Artists
      freshDb.tables['artists'] = {
        name: 'artists',
        schema: {
          name: 'artists',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'name', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null }
          ]
        },
        rows: [
          { id: 1, name: 'AC/DC' },
          { id: 2, name: 'Miles Davis' },
          { id: 3, name: 'Led Zeppelin' },
          { id: 4, name: 'Metallica' },
          { id: 5, name: 'Ludwig van Beethoven' },
          { id: 6, name: 'Pink Floyd' }
        ],
        indexes: ['id']
      };

      // 3. Albums
      freshDb.tables['albums'] = {
        name: 'albums',
        schema: {
          name: 'albums',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'title', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null },
            { name: 'artist_id', type: 'INTEGER', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null, foreignKey: { table: 'artists', column: 'id' } }
          ]
        },
        rows: [
          { id: 101, title: 'For Those About To Rock', artist_id: 1 },
          { id: 102, title: 'Kind of Blue', artist_id: 2 },
          { id: 103, title: 'IV (Zoso)', artist_id: 3 },
          { id: 104, title: 'Master of Puppets', artist_id: 4 },
          { id: 105, title: 'Symphony No. 9', artist_id: 5 },
          { id: 106, title: 'The Dark Side of the Moon', artist_id: 6 }
        ],
        indexes: ['id']
      };

      // 4. Tracks
      freshDb.tables['tracks'] = {
        name: 'tracks',
        schema: {
          name: 'tracks',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'name', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null },
            { name: 'album_id', type: 'INTEGER', isPrimaryKey: false, notNull: false, isUnique: false, defaultValue: null, foreignKey: { table: 'albums', column: 'id' } },
            { name: 'genre_id', type: 'INTEGER', isPrimaryKey: false, notNull: false, isUnique: false, defaultValue: null, foreignKey: { table: 'genres', column: 'id' } },
            { name: 'milliseconds', type: 'INTEGER', isPrimaryKey: false, notNull: false, isUnique: false, defaultValue: 240000 },
            { name: 'unit_price', type: 'REAL', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 0.99 }
          ]
        },
        rows: [
          { id: 1, name: 'For Those About To Rock We Salute You', album_id: 101, genre_id: 1, milliseconds: 343000, unit_price: 0.99 },
          { id: 2, name: 'So What', album_id: 102, genre_id: 2, milliseconds: 562000, unit_price: 0.99 },
          { id: 3, name: 'Stairway to Heaven', album_id: 103, genre_id: 1, milliseconds: 482000, unit_price: 1.29 },
          { id: 4, name: 'Battery', album_id: 104, genre_id: 3, milliseconds: 312000, unit_price: 0.99 },
          { id: 5, name: 'Ode to Joy', album_id: 105, genre_id: 4, milliseconds: 615000, unit_price: 0.99 },
          { id: 6, name: 'Time', album_id: 106, genre_id: 1, milliseconds: 421000, unit_price: 1.29 }
        ],
        indexes: ['id']
      };
    } else if (name === 'project') {
      // Agile project tracker schema config loading
      freshDb.tables['users'] = {
        name: 'users',
        schema: {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'username', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: true, defaultValue: null },
            { name: 'role', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 'Engineer' }
          ]
        },
        rows: [
          { id: 1, username: 'AdaLovelace', role: 'Architect' },
          { id: 2, username: 'AlanTuring', role: 'Dev Lead' },
          { id: 3, username: 'GraceHopper', role: 'SRE' }
        ],
        indexes: ['id']
      };

      freshDb.tables['projects'] = {
        name: 'projects',
        schema: {
          name: 'projects',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'title', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null },
            { name: 'status', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 'Planning' }
          ]
        },
        rows: [
          { id: 21, title: 'Quantum Sync Engine', status: 'In Progress' },
          { id: 22, title: 'AI Workspace Agent', status: 'Completed' }
        ],
        indexes: ['id']
      };

      freshDb.tables['tasks'] = {
        name: 'tasks',
        schema: {
          name: 'tasks',
          columns: [
            { name: 'id', type: 'INTEGER', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'project_id', type: 'INTEGER', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null, foreignKey: { table: 'projects', column: 'id' } },
            { name: 'owner_id', type: 'INTEGER', isPrimaryKey: false, notNull: false, isUnique: false, defaultValue: null, foreignKey: { table: 'users', column: 'id' } },
            { name: 'description', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: null },
            { name: 'priority', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 'Medium' }
          ]
        },
        rows: [
          { id: 1001, project_id: 21, owner_id: 1, description: 'Design multi-node synchronization cluster', priority: 'High' },
          { id: 1002, project_id: 21, owner_id: 2, description: 'Fix race conditions on atomic cache writes', priority: 'High' },
          { id: 1003, project_id: 22, owner_id: 3, description: 'Verify build compilation safety guidelines', priority: 'Low' }
        ],
        indexes: ['id']
      };
    } else {
      // IoT Ledger
      freshDb.tables['devices'] = {
        name: 'devices',
        schema: {
          name: 'devices',
          columns: [
            { name: 'id', type: 'TEXT', isPrimaryKey: true, notNull: true, isUnique: true, defaultValue: null },
            { name: 'model', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 'Thermocouple' },
            { name: 'floor', type: 'INTEGER', isPrimaryKey: false, notNull: false, isUnique: false, defaultValue: 1 }
          ]
        },
        rows: [
          { id: 'SENS_A1', model: 'TempSense-XP', floor: 1 },
          { id: 'SENS_B2', model: 'HumidSense-Plus', floor: 2 },
          { id: 'SENS_C3', model: 'BaroPress-Max', floor: 1 }
        ],
        indexes: ['id']
      };

      freshDb.tables['readings'] = {
        name: 'readings',
        schema: {
          name: 'readings',
          columns: [
            { name: 'device_id', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, foreignKey: { table: 'devices', column: 'id' }, defaultValue: null },
            { name: 'timestamp', type: 'TEXT', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: '2026-06-09T12:00:00Z' },
            { name: 'value', type: 'REAL', isPrimaryKey: false, notNull: true, isUnique: false, defaultValue: 0.0 }
          ]
        },
        rows: [
          { device_id: 'SENS_A1', timestamp: '2026-06-09T14:30:00Z', value: 24.32 },
          { device_id: 'SENS_B2', timestamp: '2026-06-09T14:31:00Z', value: 58.11 },
          { device_id: 'SENS_C3', timestamp: '2026-06-09T14:32:00Z', value: 1013.25 },
          { device_id: 'SENS_A1', timestamp: '2026-06-09T14:45:00Z', value: 25.10 }
        ],
        indexes: []
      };
    }

    return freshDb;
  }
}
