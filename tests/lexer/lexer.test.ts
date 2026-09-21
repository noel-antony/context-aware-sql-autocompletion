/**
 * Lexer Tests
 *
 * Comprehensive tests for the SQL lexical analyzer covering:
 * keywords, identifiers, numbers, strings, operators,
 * punctuation, malformed input, and unknown characters.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/compiler/lexer/lexer';
import { TokenType } from '../../src/compiler/lexer/token';

describe('Lexer', () => {
  // ─── Keywords ────────────────────────────────────────────────

  describe('keywords', () => {
    it('recognizes SQL keywords case-insensitively', () => {
      const result = tokenize('SELECT from WHERE');
      const types = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(types).toHaveLength(3);
      expect(types[0].type).toBe(TokenType.KEYWORD);
      expect(types[0].upperValue).toBe('SELECT');
      expect(types[1].type).toBe(TokenType.KEYWORD);
      expect(types[1].upperValue).toBe('FROM');
      expect(types[2].type).toBe(TokenType.KEYWORD);
      expect(types[2].upperValue).toBe('WHERE');
    });

    it('recognizes all supported keywords', () => {
      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
        'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC',
        'LIMIT', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'LIKE',
        'TRUE', 'FALSE', 'AS', 'DISTINCT',
      ];
      const result = tokenize(keywords.join(' '));
      const kwTokens = result.tokens.filter(t => t.type === TokenType.KEYWORD);
      expect(kwTokens).toHaveLength(keywords.length);
    });

    it('treats mixed-case keywords as keywords', () => {
      const result = tokenize('SeLeCt fRoM');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[1].type).toBe(TokenType.KEYWORD);
    });
  });

  // ─── Identifiers ────────────────────────────────────────────

  describe('identifiers', () => {
    it('recognizes simple identifiers', () => {
      const result = tokenize('Student name department_id');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens).toHaveLength(3);
      tokens.forEach(t => expect(t.type).toBe(TokenType.IDENTIFIER));
    });

    it('preserves original case in value', () => {
      const result = tokenize('MyTable');
      expect(result.tokens[0].value).toBe('MyTable');
      expect(result.tokens[0].upperValue).toBe('MYTABLE');
    });

    it('supports identifiers starting with underscore', () => {
      const result = tokenize('_col1');
      expect(result.tokens[0].type).toBe(TokenType.IDENTIFIER);
    });
  });

  // ─── Numbers ─────────────────────────────────────────────────

  describe('numbers', () => {
    it('recognizes integers', () => {
      const result = tokenize('42 100 0');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens).toHaveLength(3);
      tokens.forEach(t => expect(t.type).toBe(TokenType.INTEGER));
    });

    it('recognizes decimals', () => {
      const result = tokenize('3.14 0.5');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens).toHaveLength(2);
      tokens.forEach(t => expect(t.type).toBe(TokenType.DECIMAL));
    });

    it('handles integer followed by dot without decimal part as separate tokens', () => {
      const result = tokenize('42.');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens[0].type).toBe(TokenType.INTEGER);
      expect(tokens[0].value).toBe('42');
      expect(tokens[1].type).toBe(TokenType.DOT);
    });
  });

  // ─── Strings ─────────────────────────────────────────────────

  describe('strings', () => {
    it('recognizes single-quoted strings', () => {
      const result = tokenize("'hello'");
      expect(result.tokens[0].type).toBe(TokenType.STRING);
      expect(result.tokens[0].value).toBe("'hello'");
    });

    it('handles escaped quotes', () => {
      const result = tokenize("'it''s'");
      expect(result.tokens[0].type).toBe(TokenType.STRING);
      expect(result.tokens[0].value).toBe("'it''s'");
    });

    it('detects unterminated strings', () => {
      const result = tokenize("'unclosed");
      expect(result.tokens[0].type).toBe(TokenType.UNKNOWN);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].message).toContain('Unterminated');
    });

    it('handles empty strings', () => {
      const result = tokenize("''");
      expect(result.tokens[0].type).toBe(TokenType.STRING);
    });
  });

  // ─── Operators ───────────────────────────────────────────────

  describe('operators', () => {
    it('recognizes all comparison operators', () => {
      const result = tokenize('= != <> < <= > >=');
      const ops = result.tokens.filter(t => t.type === TokenType.OPERATOR);
      expect(ops).toHaveLength(7);
      expect(ops.map(o => o.value)).toEqual(['=', '!=', '<>', '<', '<=', '>', '>=']);
    });
  });

  // ─── Punctuation ─────────────────────────────────────────────

  describe('punctuation', () => {
    it('recognizes comma, dot, parens, star, semicolon', () => {
      const result = tokenize(', . ( ) * ;');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.COMMA,
        TokenType.DOT,
        TokenType.LPAREN,
        TokenType.RPAREN,
        TokenType.STAR,
        TokenType.SEMICOLON,
      ]);
    });
  });

  // ─── Unknown Characters ─────────────────────────────────────

  describe('unknown characters', () => {
    it('reports unknown characters', () => {
      const result = tokenize('SELECT @name');
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const unknown = result.tokens.find(t => t.type === TokenType.UNKNOWN);
      expect(unknown).toBeDefined();
      expect(unknown?.value).toBe('@');
    });
  });

  // ─── Position Tracking ──────────────────────────────────────

  describe('position tracking', () => {
    it('tracks line and column numbers', () => {
      const result = tokenize('SELECT\nname');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
      expect(tokens[1].line).toBe(2);
      expect(tokens[1].column).toBe(1);
    });

    it('tracks character offsets', () => {
      const result = tokenize('SELECT name');
      expect(result.tokens[0].offset).toBe(0);
      expect(result.tokens[0].length).toBe(6);
      expect(result.tokens[1].offset).toBe(7);
      expect(result.tokens[1].length).toBe(4);
    });
  });

  // ─── Comments ────────────────────────────────────────────────

  describe('comments', () => {
    it('skips line comments', () => {
      const result = tokenize('SELECT -- this is a comment\nname');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens).toHaveLength(2);
      expect(tokens[0].upperValue).toBe('SELECT');
      expect(tokens[1].value).toBe('name');
    });
  });

  // ─── EOF ─────────────────────────────────────────────────────

  describe('EOF', () => {
    it('always ends with EOF', () => {
      const result = tokenize('');
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].type).toBe(TokenType.EOF);
    });

    it('has EOF after all tokens', () => {
      const result = tokenize('SELECT');
      expect(result.tokens[result.tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });

  // ─── Complex Queries ────────────────────────────────────────

  describe('complex queries', () => {
    it('tokenizes a full query correctly', () => {
      const result = tokenize(
        "SELECT s.name, d.name FROM Student s JOIN Department d ON s.department_id = d.id WHERE s.cgpa > 3.5"
      );
      expect(result.diagnostics).toHaveLength(0);
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens.length).toBeGreaterThan(15);
    });
  });
});
