/**
 * Schema Type Definitions
 *
 * Typed structures representing database schemas, tables, columns,
 * and their relationships. Used by the symbol table and semantic
 * analyzer for name resolution and type checking.
 */

// ─── Column Types ──────────────────────────────────────────────────

export enum ColumnType {
  INT = 'INT',
  FLOAT = 'FLOAT',
  TEXT = 'TEXT',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  UNKNOWN = 'UNKNOWN',
}

// ─── Foreign Key ───────────────────────────────────────────────────

export interface ForeignKey {
  /** Column in this table */
  column: string;
  /** Referenced table */
  refTable: string;
  /** Referenced column */
  refColumn: string;
}

// ─── Column Definition ────────────────────────────────────────────

export interface ColumnDef {
  name: string;
  type: ColumnType;
  /** Whether this column is part of the primary key */
  isPrimaryKey: boolean;
  /** Whether this column is nullable */
  nullable: boolean;
}

// ─── Table Definition ──────────────────────────────────────────────

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  foreignKeys: ForeignKey[];
}

// ─── Schema Definition ────────────────────────────────────────────

export interface SchemaDef {
  name: string;
  tables: TableDef[];
}
