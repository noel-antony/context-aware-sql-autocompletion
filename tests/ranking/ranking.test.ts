/**
 * Ranking Engine Tests
 *
 * Verifies deterministic ordering and score computation.
 * Same input must always produce the same ranking.
 */

import { describe, it, expect } from 'vitest';
import { runPipeline } from '../../src/compiler/pipeline';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';

function getRankedLabels(sql: string, cursorOffset?: number): string[] {
  const catalog = new SchemaCatalog();
  const result = runPipeline(sql, cursorOffset ?? sql.length, catalog);
  return result.candidates.map(c => c.label);
}

describe('RankingEngine', () => {
  describe('deterministic ordering', () => {
    it('produces identical rankings for identical inputs', () => {
      const first = getRankedLabels('SELECT s.\nFROM Student s', 9);
      const second = getRankedLabels('SELECT s.\nFROM Student s', 9);
      expect(first).toEqual(second);
    });

    it('produces identical rankings across multiple runs', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(getRankedLabels('SELECT * FROM '));
      }
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('score properties', () => {
    it('all scores are in [0, 1]', () => {
      const catalog = new SchemaCatalog();
      const pipeResult = runPipeline('SELECT s.name\nFROM Student s\nWHERE ', 'SELECT s.name\nFROM Student s\nWHERE '.length, catalog);
      for (const c of pipeResult.candidates) {
        expect(c.syntaxScore).toBeGreaterThanOrEqual(0);
        expect(c.syntaxScore).toBeLessThanOrEqual(1);
        expect(c.semanticScore).toBeGreaterThanOrEqual(0);
        expect(c.semanticScore).toBeLessThanOrEqual(1);
        expect(c.typeScore).toBeGreaterThanOrEqual(0);
        expect(c.typeScore).toBeLessThanOrEqual(1);
        expect(c.contextScore).toBeGreaterThanOrEqual(0);
        expect(c.contextScore).toBeLessThanOrEqual(1);
        expect(c.prefixScore).toBeGreaterThanOrEqual(0);
        expect(c.prefixScore).toBeLessThanOrEqual(1);
        expect(c.finalScore).toBeGreaterThanOrEqual(0);
        expect(c.finalScore).toBeLessThanOrEqual(1);
      }
    });

    it('every candidate has a non-empty explanation', () => {
      const catalog = new SchemaCatalog();
      const result = runPipeline('SELECT * FROM ', 14, catalog);
      for (const c of result.candidates) {
        expect(c.explanation).toBeTruthy();
        expect(c.explanation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('ranking preferences', () => {
    it('ranks schema tables higher than keywords in FROM context', () => {
      const catalog = new SchemaCatalog();
      const result = runPipeline('SELECT * FROM ', 14, catalog);
      const tables = result.candidates.filter(c => c.kind === 'TABLE');
      expect(tables.length).toBeGreaterThan(0);
      // Tables should be among the top candidates
      const tableIndices = tables.map(t => result.candidates.indexOf(t));
      expect(Math.min(...tableIndices)).toBeLessThan(5);
    });
  });
});
