/**
 * Symbol Table Tests
 *
 * Tests for the compiler-style symbol table: table/alias registration,
 * qualified/unqualified column lookup, and ambiguity detection.
 */

import { describe, it, expect } from 'vitest';
import { SymbolTable } from '../../src/compiler/semantic/symbolTable';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';

function createSymbolTable(): SymbolTable {
  return new SymbolTable(new SchemaCatalog());
}

describe('SymbolTable', () => {
  it('registers and looks up tables', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    const sym = st.lookupTable('s');
    expect(sym).toBeDefined();
    expect(sym!.tableName).toBe('Student');
    expect(sym!.isAlias).toBe(true);
  });

  it('registers tables without alias', () => {
    const st = createSymbolTable();
    st.registerTable('Student');
    const sym = st.lookupTable('Student');
    expect(sym).toBeDefined();
    expect(sym!.isAlias).toBe(false);
  });

  it('resolves qualified columns', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    const res = st.resolveQualifiedColumn('s', 'name');
    expect(res.resolved).toBe(true);
    expect(res.column!.columnName).toBe('name');
    expect(res.column!.columnType).toBe('TEXT');
  });

  it('detects unknown qualified columns', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    const res = st.resolveQualifiedColumn('s', 'nonexistent');
    expect(res.resolved).toBe(false);
    expect(res.error).toContain('nonexistent');
  });

  it('resolves unqualified columns', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    const res = st.resolveUnqualifiedColumn('name');
    expect(res.resolved).toBe(true);
  });

  it('detects ambiguous unqualified columns', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    st.registerTable('Department', 'd');
    const res = st.resolveUnqualifiedColumn('id');
    expect(res.ambiguous).toBe(true);
    expect(res.candidates!.length).toBe(2);
  });

  it('returns all visible columns for a qualifier', () => {
    const st = createSymbolTable();
    st.registerTable('Student', 's');
    const cols = st.getColumnsForTable('s');
    expect(cols.length).toBe(4); // id, name, department_id, cgpa
  });

  it('detects unknown table', () => {
    const st = createSymbolTable();
    const result = st.registerTable('NonExistent', 'x');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown table');
  });
});
