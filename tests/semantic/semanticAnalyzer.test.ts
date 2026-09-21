/**
 * Semantic Analyzer Tests
 *
 * Tests for name resolution and type checking including:
 * valid/invalid tables, columns, aliases, ambiguity, type compatibility.
 */

import { describe, it, expect } from 'vitest';
import { parseSQL } from '../../src/compiler/parser/parser';
import { SemanticAnalyzer } from '../../src/compiler/semantic/semanticAnalyzer';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';
import { DiagnosticCode } from '../../src/compiler/diagnostics/diagnostics';

function analyzeQuery(sql: string) {
  const catalog = new SchemaCatalog();
  const result = parseSQL(sql);
  if (!result.ast) return { diagnostics: [], symbolTable: null };
  const analyzer = new SemanticAnalyzer(catalog);
  return analyzer.analyze(result.ast);
}

function getDiagnosticCodes(sql: string): string[] {
  const result = analyzeQuery(sql);
  return result.diagnostics.map(d => d.code);
}

describe('SemanticAnalyzer', () => {
  describe('table resolution', () => {
    it('accepts valid table names', () => {
      const codes = getDiagnosticCodes('SELECT * FROM Student');
      expect(codes).not.toContain(DiagnosticCode.UNKNOWN_TABLE);
    });

    it('detects unknown table names', () => {
      const codes = getDiagnosticCodes('SELECT * FROM NonExistent');
      expect(codes).toContain(DiagnosticCode.UNKNOWN_TABLE);
    });
  });

  describe('alias resolution', () => {
    it('accepts valid aliases', () => {
      const codes = getDiagnosticCodes('SELECT s.name FROM Student s');
      expect(codes).not.toContain(DiagnosticCode.UNKNOWN_ALIAS);
    });

    it('detects unknown aliases', () => {
      const codes = getDiagnosticCodes('SELECT x.name FROM Student s');
      expect(codes).toContain(DiagnosticCode.UNKNOWN_ALIAS);
    });
  });

  describe('column resolution', () => {
    it('accepts valid qualified columns', () => {
      const codes = getDiagnosticCodes('SELECT s.name FROM Student s');
      expect(codes).not.toContain(DiagnosticCode.UNKNOWN_COLUMN);
    });

    it('detects unknown qualified columns', () => {
      const codes = getDiagnosticCodes('SELECT s.nonexistent FROM Student s');
      expect(codes).toContain(DiagnosticCode.UNKNOWN_COLUMN);
    });

    it('detects ambiguous unqualified columns', () => {
      const result = analyzeQuery(
        'SELECT id FROM Student s JOIN Department d ON s.department_id = d.id'
      );
      const codes = result.diagnostics.map(d => d.code);
      expect(codes).toContain(DiagnosticCode.AMBIGUOUS_COLUMN);
    });
  });

  describe('type checking', () => {
    it('accepts valid numeric comparison', () => {
      const codes = getDiagnosticCodes('SELECT s.name FROM Student s WHERE s.cgpa > 3.0');
      expect(codes).not.toContain(DiagnosticCode.TYPE_MISMATCH);
    });

    it('detects numeric vs text type mismatch', () => {
      const codes = getDiagnosticCodes(
        "SELECT s.name FROM Student s WHERE s.cgpa > 'hello'"
      );
      expect(codes).toContain(DiagnosticCode.TYPE_MISMATCH);
    });

    it('accepts text comparison', () => {
      const codes = getDiagnosticCodes(
        "SELECT s.name FROM Student s WHERE s.name = 'Alice'"
      );
      expect(codes).not.toContain(DiagnosticCode.TYPE_MISMATCH);
    });

    it('accepts INT compared with FLOAT (numeric compatibility)', () => {
      const codes = getDiagnosticCodes(
        'SELECT s.name FROM Student s WHERE s.id > 3.5'
      );
      expect(codes).not.toContain(DiagnosticCode.TYPE_MISMATCH);
    });
  });

  describe('LIMIT validation', () => {
    it('accepts integer LIMIT', () => {
      const codes = getDiagnosticCodes('SELECT name FROM Student LIMIT 10');
      expect(codes).not.toContain(DiagnosticCode.INVALID_LIMIT_TYPE);
    });

    it('detects non-integer LIMIT', () => {
      const codes = getDiagnosticCodes("SELECT name FROM Student LIMIT 'abc'");
      expect(codes).toContain(DiagnosticCode.INVALID_LIMIT_TYPE);
    });
  });

  describe('IS NULL', () => {
    it('accepts IS NULL on any type', () => {
      const codes = getDiagnosticCodes('SELECT name FROM Student WHERE name IS NULL');
      expect(codes).not.toContain(DiagnosticCode.TYPE_MISMATCH);
    });
  });
});
