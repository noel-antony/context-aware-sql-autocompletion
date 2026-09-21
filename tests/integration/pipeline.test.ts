/**
 * Integration Tests
 *
 * End-to-end tests exercising the complete pipeline:
 * editor text → compiler pipeline → parser state
 * → semantic analysis → candidates → ranking
 */

import { describe, it, expect } from 'vitest';
import { runPipeline, PipelineResult } from '../../src/compiler/pipeline';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';
import { ParserState } from '../../src/compiler/parser/parserState';

function pipeline(sql: string, cursorOffset?: number): PipelineResult {
  const catalog = new SchemaCatalog();
  return runPipeline(sql, cursorOffset ?? sql.length, catalog);
}

describe('Integration', () => {
  describe('full pipeline flow', () => {
    it('returns tokens, context, candidates, and diagnostics', () => {
      const result = pipeline('SELECT s.name FROM Student s WHERE ');
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.context).toBeDefined();
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.diagnostics).toBeDefined();
    });

    it('produces no errors for valid complete query', () => {
      const result = pipeline('SELECT s.name FROM Student s');
      expect(result.diagnostics).toHaveLength(0);
    });

    it('produces semantic error for unknown column', () => {
      const result = pipeline('SELECT s.nonexistent FROM Student s');
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.some(d => d.message.includes('nonexistent'))).toBe(true);
    });

    it('produces type mismatch for invalid comparison', () => {
      const result = pipeline("SELECT s.name FROM Student s WHERE s.cgpa > 'hello'");
      expect(result.diagnostics.some(d => d.code === 'TYPE_MISMATCH')).toBe(true);
    });

    it('detects ambiguous column', () => {
      const result = pipeline(
        'SELECT id FROM Student s JOIN Department d ON s.department_id = d.id'
      );
      expect(result.diagnostics.some(d => d.code === 'AMBIGUOUS_COLUMN')).toBe(true);
    });
  });

  describe('parser state integration', () => {
    it('reports DOT_ACCESS when typing alias.', () => {
      const result = pipeline('SELECT s.\nFROM Student s', 9);
      expect(result.context.parserState).toBe(ParserState.DOT_ACCESS);
    });

    it('reports correct active clause', () => {
      const result = pipeline('SELECT name FROM Student WHERE ');
      expect(result.context.activeClause).toBe('WHERE');
    });
  });

  describe('candidate generation integration', () => {
    it('generates table candidates for FROM', () => {
      const result = pipeline('SELECT * FROM ');
      const tableNames = result.candidates.filter(c => c.kind === 'TABLE').map(c => c.label);
      expect(tableNames).toContain('Student');
      expect(tableNames).toContain('Department');
    });

    it('generates qualified columns for alias dot', () => {
      const result = pipeline('SELECT s.\nFROM Student s', 9);
      const labels = result.candidates.map(c => c.label);
      expect(labels).toContain('name');
      expect(labels).toContain('cgpa');
    });

    it('generates direction candidates for ORDER BY after column', () => {
      const result = pipeline('SELECT name FROM Student ORDER BY name ');
      const labels = result.candidates.map(c => c.label);
      expect(labels).toContain('ASC');
      expect(labels).toContain('DESC');
    });
  });

  describe('empty and edge cases', () => {
    it('handles empty input without crashing', () => {
      const result = pipeline('');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].label).toBe('SELECT');
    });

    it('handles whitespace-only input', () => {
      const result = pipeline('   ');
      expect(result).toBeDefined();
    });

    it('handles cursor in middle of query', () => {
      const sql = 'SELECT name FROM Student WHERE name';
      const result = pipeline(sql, 14); // cursor at end of "SELECT name FR"
      expect(result).toBeDefined();
    });
  });
});
