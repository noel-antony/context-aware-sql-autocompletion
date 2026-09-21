/**
 * Schema Catalog
 *
 * Registry of available database schemas.
 * Provides lookup by name and table-level access.
 */

import { SchemaDef, TableDef } from './schemaTypes';
import { universitySchema, ecommerceSchema } from './sampleSchema';

// ─── Schema Catalog ───────────────────────────────────────────────

export class SchemaCatalog {
  private schemas: Map<string, SchemaDef> = new Map();
  private activeSchemaName: string;

  constructor() {
    this.registerSchema(universitySchema);
    this.registerSchema(ecommerceSchema);
    this.activeSchemaName = universitySchema.name;
  }

  registerSchema(schema: SchemaDef): void {
    this.schemas.set(schema.name, schema);
  }

  getActiveSchema(): SchemaDef {
    return this.schemas.get(this.activeSchemaName)!;
  }

  setActiveSchema(name: string): boolean {
    if (this.schemas.has(name)) {
      this.activeSchemaName = name;
      return true;
    }
    return false;
  }

  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  getSchema(name: string): SchemaDef | undefined {
    return this.schemas.get(name);
  }

  /**
   * Look up a table by name in the active schema (case-insensitive).
   */
  findTable(tableName: string): TableDef | undefined {
    const schema = this.getActiveSchema();
    return schema.tables.find(
      t => t.name.toLowerCase() === tableName.toLowerCase()
    );
  }

  /**
   * Get all table names in the active schema.
   */
  getTableNames(): string[] {
    return this.getActiveSchema().tables.map(t => t.name);
  }

  /**
   * Get all tables in the active schema.
   */
  getTables(): TableDef[] {
    return this.getActiveSchema().tables;
  }
}

// ─── Default Catalog Instance ─────────────────────────────────────

export const defaultCatalog = new SchemaCatalog();
