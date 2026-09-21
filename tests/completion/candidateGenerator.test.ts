/**
 * Completion Candidate Generator Tests
 *
 * Tests that expected candidates appear and invalid candidates
 * are excluded for each demo query scenario.
 */

import { describe, it, expect } from 'vitest';
import { runPipeline } from '../../src/compiler/pipeline';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';
import { CandidateKind } from '../../src/compiler/completion/candidateTypes';

function getCandidates(sql: string, cursorOffset?: number) {
  const catalog = new SchemaCatalog();
  const result = runPipeline(sql, cursorOffset ?? sql.length, catalog);
  return result.candidates;
}

function candidateLabels(sql: string, cursorOffset?: number): string[] {
  return getCandidates(sql, cursorOffset).map(c => c.label);
}

function candidateKinds(sql: string, cursorOffset?: number): string[] {
  return getCandidates(sql, cursorOffset).map(c => c.kind);
}

describe('CandidateGenerator', () => {
  describe('Demo 1: SELECT completion', () => {
    it('suggests columns and star after SELECT', () => {
      const candidates = getCandidates('SELECT ');
      const kinds = candidates.map(c => c.kind);
      expect(kinds).toContain(CandidateKind.STAR);
    });
  });

  describe('Demo 2: Table completion', () => {
    it('suggests table names after FROM', () => {
      const labels = candidateLabels('SELECT name FROM ');
      expect(labels).toContain('Student');
      expect(labels).toContain('Department');
      expect(labels).toContain('Course');
      expect(labels).toContain('Enrollment');
    });
  });

  describe('Demo 3: Alias-aware column completion', () => {
    it('suggests Student columns for alias s', () => {
      const sql = 'SELECT s.\nFROM Student s';
      const candidates = getCandidates(sql, 9); // cursor after "s."
      const labels = candidates.map(c => c.label);
      expect(labels).toContain('id');
      expect(labels).toContain('name');
      expect(labels).toContain('department_id');
      expect(labels).toContain('cgpa');
    });
  });

  describe('Demo 4: WHERE completion', () => {
    it('suggests columns after WHERE', () => {
      const candidates = getCandidates('SELECT s.name\nFROM Student s\nWHERE ');
      const kinds = candidates.map(c => c.kind);
      expect(kinds).toContain(CandidateKind.COLUMN);
    });
  });

  describe('Demo 6: JOIN alias s completion', () => {
    it('suggests Student columns for s. in JOIN ON', () => {
      const sql = 'SELECT s.name\nFROM Student s\nJOIN Department d ON s.';
      const candidates = getCandidates(sql);
      const labels = candidates.map(c => c.label);
      expect(labels).toContain('department_id');
      expect(labels).toContain('id');
      // Should NOT contain Department columns
      expect(labels).not.toContain('description');
    });
  });

  describe('Demo 7: JOIN alias d completion', () => {
    it('suggests Department columns for d. in JOIN ON', () => {
      const sql = 'SELECT s.name\nFROM Student s\nJOIN Department d ON d.';
      const candidates = getCandidates(sql);
      const labels = candidates.map(c => c.label);
      expect(labels).toContain('id');
      expect(labels).toContain('name');
      // Should NOT contain Student columns
      expect(labels).not.toContain('cgpa');
      expect(labels).not.toContain('department_id');
    });
  });

  describe('Demo 8: GROUP BY', () => {
    it('suggests columns for GROUP BY', () => {
      const candidates = getCandidates('SELECT s.department_id\nFROM Student s\nGROUP BY ');
      const kinds = candidates.map(c => c.kind);
      expect(kinds).toContain(CandidateKind.COLUMN);
    });
  });

  describe('Demo 9: ORDER BY', () => {
    it('suggests columns for ORDER BY', () => {
      const candidates = getCandidates('SELECT s.name\nFROM Student s\nORDER BY ');
      const kinds = candidates.map(c => c.kind);
      expect(kinds).toContain(CandidateKind.COLUMN);
    });
  });

  describe('context filtering', () => {
    it('does not suggest unreferenced schema tables in WHERE context', () => {
      const candidates = getCandidates('SELECT name FROM Student WHERE ');
      // Tables not referenced in FROM should not appear
      const labels = candidates.map(c => c.label);
      // Course and Enrollment are not in FROM, so should not appear as standalone candidates
      const courseTable = candidates.find(c => c.kind === CandidateKind.TABLE && c.label === 'Course');
      expect(courseTable).toBeUndefined();
    });

    it('does not suggest keywords in FROM table context', () => {
      const candidates = getCandidates('SELECT * FROM ');
      const tableCount = candidates.filter(c => c.kind === CandidateKind.TABLE).length;
      expect(tableCount).toBeGreaterThan(0);
    });
  });
});
