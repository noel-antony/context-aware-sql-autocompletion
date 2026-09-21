/**
 * Prefix Parser Tests
 *
 * Tests that the correct parser state is produced for each demo query.
 * Verifies that the tolerant parser handles incomplete SQL correctly.
 */

import { describe, it, expect } from 'vitest';
import { analyzePrefixSQL } from '../../src/compiler/parser/prefixParser';
import { ParserState, ActiveClause } from '../../src/compiler/parser/parserState';

describe('PrefixParser', () => {
  describe('demo queries', () => {
    it('Demo 1: "SELECT " → AFTER_SELECT', () => {
      const ctx = analyzePrefixSQL('SELECT ');
      expect([ParserState.AFTER_SELECT, ParserState.SELECT_LIST]).toContain(ctx.parserState);
      expect(ctx.activeClause).toBe(ActiveClause.SELECT);
    });

    it('Demo 2: "SELECT name FROM " → FROM_TABLE', () => {
      const ctx = analyzePrefixSQL('SELECT name FROM ');
      expect(ctx.parserState).toBe(ParserState.FROM_TABLE);
      expect(ctx.activeClause).toBe(ActiveClause.FROM);
    });

    it('Demo 3: "SELECT s.\\nFROM Student s" with cursor after dot → DOT_ACCESS', () => {
      const sql = 'SELECT s.\nFROM Student s';
      const cursorOffset = 9; // right after the dot
      const ctx = analyzePrefixSQL(sql, cursorOffset);
      expect(ctx.parserState).toBe(ParserState.DOT_ACCESS);
      expect(ctx.dotQualifier).toBe('s');
    });

    it('Demo 4: "SELECT s.name\\nFROM Student s\\nWHERE " → WHERE_START', () => {
      const ctx = analyzePrefixSQL('SELECT s.name\nFROM Student s\nWHERE ');
      expect([ParserState.WHERE_START, ParserState.WHERE_OPERAND]).toContain(ctx.parserState);
      expect(ctx.activeClause).toBe(ActiveClause.WHERE);
    });

    it('Demo 5: "...WHERE s.cgpa > " → WHERE_RIGHT_OPERAND', () => {
      const ctx = analyzePrefixSQL('SELECT s.name\nFROM Student s\nWHERE s.cgpa > ');
      expect(ctx.parserState).toBe(ParserState.WHERE_RIGHT_OPERAND);
    });

    it('Demo 6: "JOIN Department d ON s." → DOT_ACCESS with s qualifier', () => {
      const ctx = analyzePrefixSQL('SELECT s.name\nFROM Student s\nJOIN Department d ON s.');
      expect(ctx.parserState).toBe(ParserState.DOT_ACCESS);
      expect(ctx.dotQualifier).toBe('s');
    });

    it('Demo 7: "JOIN Department d ON d." → DOT_ACCESS with d qualifier', () => {
      const ctx = analyzePrefixSQL('SELECT s.name\nFROM Student s\nJOIN Department d ON d.');
      expect(ctx.parserState).toBe(ParserState.DOT_ACCESS);
      expect(ctx.dotQualifier).toBe('d');
    });

    it('Demo 8: "GROUP BY " → GROUP_BY_START', () => {
      const ctx = analyzePrefixSQL('SELECT s.department_id\nFROM Student s\nGROUP BY ');
      expect([ParserState.GROUP_BY_START, ParserState.GROUP_BY_COLUMN]).toContain(ctx.parserState);
      expect(ctx.activeClause).toBe(ActiveClause.GROUP_BY);
    });

    it('Demo 9: "ORDER BY " → ORDER_BY_START', () => {
      const ctx = analyzePrefixSQL('SELECT s.name\nFROM Student s\nORDER BY ');
      expect([ParserState.ORDER_BY_START, ParserState.ORDER_BY_COLUMN]).toContain(ctx.parserState);
      expect(ctx.activeClause).toBe(ActiveClause.ORDER_BY);
    });
  });

  describe('alias tracking', () => {
    it('tracks aliases from FROM clause', () => {
      const ctx = analyzePrefixSQL('SELECT * FROM Student s WHERE ');
      expect(ctx.activeAliases).toContainEqual({ alias: 's', tableName: 'Student' });
    });

    it('tracks aliases from JOIN clause', () => {
      const ctx = analyzePrefixSQL('SELECT * FROM Student s JOIN Department d ON ');
      expect(ctx.activeAliases).toContainEqual({ alias: 's', tableName: 'Student' });
      expect(ctx.activeAliases).toContainEqual({ alias: 'd', tableName: 'Department' });
    });

    it('tracks tables without aliases', () => {
      const ctx = analyzePrefixSQL('SELECT * FROM Student WHERE ');
      expect(ctx.activeTables).toContain('Student');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const ctx = analyzePrefixSQL('');
      expect(ctx.parserState).toBe(ParserState.START);
    });

    it('handles trailing spaces', () => {
      const ctx = analyzePrefixSQL('SELECT   ');
      expect([ParserState.AFTER_SELECT, ParserState.SELECT_LIST]).toContain(ctx.parserState);
    });

    it('handles incomplete keyword', () => {
      const ctx = analyzePrefixSQL('SEL');
      // Should handle partial keyword gracefully
      expect(ctx).toBeDefined();
    });

    it('does not crash on malformed input', () => {
      expect(() => analyzePrefixSQL('!!!')).not.toThrow();
      expect(() => analyzePrefixSQL('SELECT FROM WHERE JOIN')).not.toThrow();
      expect(() => analyzePrefixSQL("SELECT 'unterminated")).not.toThrow();
    });
  });

  describe('prefix tracking', () => {
    it('detects current prefix after space', () => {
      const ctx = analyzePrefixSQL('SELECT na');
      expect(ctx.currentPrefix).toBe('na');
    });

    it('returns empty prefix after space', () => {
      const ctx = analyzePrefixSQL('SELECT ');
      expect(ctx.currentPrefix).toBe('');
    });
  });
});
