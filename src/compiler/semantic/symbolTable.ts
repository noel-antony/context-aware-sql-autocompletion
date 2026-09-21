/**
 * Symbol Table — Compiler-Style Name Resolution
 *
 * Tracks tables, aliases, columns, and their types within a query scope.
 * Supports qualified and unqualified column lookup, ambiguity detection,
 * and scope-aware resolution.
 */

import { ColumnType, TableDef, ColumnDef } from '../../schema/schemaTypes';
import { SchemaCatalog } from '../../schema/schemaCatalog';

// ─── Symbol Types ──────────────────────────────────────────────────

export interface TableSymbol {
  /** The name used to reference this table (alias if present, otherwise table name) */
  referenceName: string;
  /** The actual table name in the schema */
  tableName: string;
  /** Whether this is an alias */
  isAlias: boolean;
  /** The table definition from the schema (null if table not found) */
  tableDef: TableDef | null;
}

export interface ColumnSymbol {
  columnName: string;
  columnType: ColumnType;
  tableName: string;
  /** How this column is referenced (via alias or table name) */
  qualifier: string;
  columnDef: ColumnDef;
}

export interface ColumnResolution {
  resolved: boolean;
  column: ColumnSymbol | null;
  error: string | null;
  ambiguous: boolean;
  candidates?: ColumnSymbol[];
}

// ─── Symbol Table ──────────────────────────────────────────────────

export class SymbolTable {
  private tableSymbols: Map<string, TableSymbol> = new Map();
  private catalog: SchemaCatalog;

  constructor(catalog: SchemaCatalog) {
    this.catalog = catalog;
  }

  /**
   * Register a table reference (with optional alias).
   */
  registerTable(tableName: string, alias?: string | null): { success: boolean; error?: string } {
    const tableDef = this.catalog.findTable(tableName);
    const referenceName = alias || tableName;

    if (!tableDef) {
      // Register anyway for alias tracking, but mark as unresolved
      this.tableSymbols.set(referenceName.toLowerCase(), {
        referenceName,
        tableName,
        isAlias: !!alias,
        tableDef: null,
      });
      return { success: false, error: `Unknown table: ${tableName}` };
    }

    // Check for duplicate alias
    if (this.tableSymbols.has(referenceName.toLowerCase())) {
      return { success: false, error: `Duplicate alias: ${referenceName}` };
    }

    this.tableSymbols.set(referenceName.toLowerCase(), {
      referenceName,
      tableName,
      isAlias: !!alias,
      tableDef,
    });

    return { success: true };
  }

  /**
   * Look up a table by name or alias.
   */
  lookupTable(name: string): TableSymbol | undefined {
    return this.tableSymbols.get(name.toLowerCase());
  }

  /**
   * Look up a qualified column reference (e.g., "s.name").
   */
  resolveQualifiedColumn(qualifier: string, columnName: string): ColumnResolution {
    const tableSymbol = this.lookupTable(qualifier);

    if (!tableSymbol) {
      return {
        resolved: false,
        column: null,
        error: `Unknown table or alias: ${qualifier}`,
        ambiguous: false,
      };
    }

    if (!tableSymbol.tableDef) {
      return {
        resolved: false,
        column: null,
        error: `Table '${tableSymbol.tableName}' not found in schema`,
        ambiguous: false,
      };
    }

    const colDef = tableSymbol.tableDef.columns.find(
      c => c.name.toLowerCase() === columnName.toLowerCase()
    );

    if (!colDef) {
      return {
        resolved: false,
        column: null,
        error: `Unknown column: ${qualifier}.${columnName} (table '${tableSymbol.tableName}' has no column '${columnName}')`,
        ambiguous: false,
      };
    }

    return {
      resolved: true,
      column: {
        columnName: colDef.name,
        columnType: colDef.type,
        tableName: tableSymbol.tableName,
        qualifier: tableSymbol.referenceName,
        columnDef: colDef,
      },
      error: null,
      ambiguous: false,
    };
  }

  /**
   * Look up an unqualified column reference (e.g., just "name").
   * Checks all registered tables for the column.
   * Returns ambiguity error if found in multiple tables.
   */
  resolveUnqualifiedColumn(columnName: string): ColumnResolution {
    const matches: ColumnSymbol[] = [];

    for (const [, tableSymbol] of this.tableSymbols) {
      if (!tableSymbol.tableDef) continue;

      const colDef = tableSymbol.tableDef.columns.find(
        c => c.name.toLowerCase() === columnName.toLowerCase()
      );

      if (colDef) {
        matches.push({
          columnName: colDef.name,
          columnType: colDef.type,
          tableName: tableSymbol.tableName,
          qualifier: tableSymbol.referenceName,
          columnDef: colDef,
        });
      }
    }

    if (matches.length === 0) {
      return {
        resolved: false,
        column: null,
        error: `Unknown column: ${columnName}`,
        ambiguous: false,
      };
    }

    if (matches.length > 1) {
      const tables = matches.map(m => m.qualifier).join(', ');
      return {
        resolved: false,
        column: null,
        error: `Ambiguous column: '${columnName}' found in tables: ${tables}`,
        ambiguous: true,
        candidates: matches,
      };
    }

    return {
      resolved: true,
      column: matches[0],
      error: null,
      ambiguous: false,
    };
  }

  /**
   * Resolve a column reference (qualified or unqualified).
   */
  resolveColumn(qualifier: string | null, columnName: string): ColumnResolution {
    if (qualifier) {
      return this.resolveQualifiedColumn(qualifier, columnName);
    }
    return this.resolveUnqualifiedColumn(columnName);
  }

  /**
   * Get all columns visible for a specific table/alias.
   */
  getColumnsForTable(qualifier: string): ColumnSymbol[] {
    const tableSymbol = this.lookupTable(qualifier);
    if (!tableSymbol || !tableSymbol.tableDef) return [];

    return tableSymbol.tableDef.columns.map(col => ({
      columnName: col.name,
      columnType: col.type,
      tableName: tableSymbol.tableName,
      qualifier: tableSymbol.referenceName,
      columnDef: col,
    }));
  }

  /**
   * Get all visible columns from all registered tables.
   */
  getAllVisibleColumns(): ColumnSymbol[] {
    const columns: ColumnSymbol[] = [];

    for (const [, tableSymbol] of this.tableSymbols) {
      if (!tableSymbol.tableDef) continue;

      for (const col of tableSymbol.tableDef.columns) {
        columns.push({
          columnName: col.name,
          columnType: col.type,
          tableName: tableSymbol.tableName,
          qualifier: tableSymbol.referenceName,
          columnDef: col,
        });
      }
    }

    return columns;
  }

  /**
   * Get all registered table symbols.
   */
  getTableSymbols(): TableSymbol[] {
    return Array.from(this.tableSymbols.values());
  }

  /**
   * Get all registered reference names (aliases and unaliased table names).
   */
  getReferenceNames(): string[] {
    return Array.from(this.tableSymbols.values()).map(ts => ts.referenceName);
  }

  /**
   * Clear all registered symbols (for re-analysis).
   */
  clear(): void {
    this.tableSymbols.clear();
  }
}
