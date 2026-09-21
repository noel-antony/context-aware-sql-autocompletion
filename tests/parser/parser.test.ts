/**
 * Parser Tests
 *
 * Tests for the recursive-descent SQL parser covering
 * valid query forms and error cases.
 */

import { describe, it, expect } from 'vitest';
import { parseSQL } from '../../src/compiler/parser/parser';

describe('Parser', () => {
  describe('valid queries', () => {
    it('parses SELECT *', () => {
      const result = parseSQL('SELECT *');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.select.items).toHaveLength(1);
      expect(result.ast!.select.items[0].expression).toBe('*');
    });

    it('parses SELECT with columns', () => {
      const result = parseSQL('SELECT name, age FROM Student');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.select.items).toHaveLength(2);
      expect(result.ast!.from).not.toBeNull();
    });

    it('parses qualified column references', () => {
      const result = parseSQL('SELECT s.name FROM Student s');
      expect(result.ast).not.toBeNull();
      const item = result.ast!.select.items[0];
      expect(item.expression).not.toBe('*');
      if (item.expression !== '*') {
        expect(item.expression.type).toBe('ColumnReference');
      }
    });

    it('parses WHERE clause', () => {
      const result = parseSQL("SELECT name FROM Student WHERE name = 'Alice'");
      expect(result.ast).not.toBeNull();
      expect(result.ast!.where).not.toBeNull();
    });

    it('parses JOIN clause', () => {
      const result = parseSQL(
        'SELECT s.name FROM Student s JOIN Department d ON s.department_id = d.id'
      );
      expect(result.ast).not.toBeNull();
      expect(result.ast!.from!.joins).toHaveLength(1);
      expect(result.ast!.from!.joins[0].joinType).toBe('JOIN');
    });

    it('parses LEFT JOIN', () => {
      const result = parseSQL(
        'SELECT s.name FROM Student s LEFT JOIN Department d ON s.department_id = d.id'
      );
      expect(result.ast!.from!.joins[0].joinType).toBe('LEFT');
    });

    it('parses GROUP BY', () => {
      const result = parseSQL('SELECT department_id FROM Student GROUP BY department_id');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.groupBy).not.toBeNull();
      expect(result.ast!.groupBy!.columns).toHaveLength(1);
    });

    it('parses ORDER BY with direction', () => {
      const result = parseSQL('SELECT name FROM Student ORDER BY name ASC');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.orderBy).not.toBeNull();
      expect(result.ast!.orderBy!.items[0].direction).toBe('ASC');
    });

    it('parses LIMIT', () => {
      const result = parseSQL('SELECT name FROM Student LIMIT 10');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.limit).not.toBeNull();
    });

    it('parses IS NULL', () => {
      const result = parseSQL('SELECT name FROM Student WHERE name IS NULL');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.where).not.toBeNull();
    });

    it('parses IS NOT NULL', () => {
      const result = parseSQL('SELECT name FROM Student WHERE name IS NOT NULL');
      expect(result.ast).not.toBeNull();
    });

    it('parses LIKE', () => {
      const result = parseSQL("SELECT name FROM Student WHERE name LIKE 'A%'");
      expect(result.ast).not.toBeNull();
    });

    it('parses AND/OR conditions', () => {
      const result = parseSQL(
        "SELECT name FROM Student WHERE name = 'Alice' AND cgpa > 3.0"
      );
      expect(result.ast).not.toBeNull();
      expect(result.ast!.where!.condition.type).toBe('BinaryExpression');
    });

    it('parses DISTINCT', () => {
      const result = parseSQL('SELECT DISTINCT name FROM Student');
      expect(result.ast!.select.distinct).toBe(true);
    });

    it('parses complex query with all clauses', () => {
      const result = parseSQL(
        'SELECT s.name, d.name FROM Student s ' +
        'INNER JOIN Department d ON s.department_id = d.id ' +
        'WHERE s.cgpa > 3.0 ' +
        'GROUP BY s.department_id ' +
        'HAVING s.department_id > 0 ' +
        'ORDER BY s.name ASC ' +
        'LIMIT 10'
      );
      expect(result.ast).not.toBeNull();
      expect(result.ast!.from!.joins).toHaveLength(1);
      expect(result.ast!.where).not.toBeNull();
      expect(result.ast!.groupBy).not.toBeNull();
      expect(result.ast!.having).not.toBeNull();
      expect(result.ast!.orderBy).not.toBeNull();
      expect(result.ast!.limit).not.toBeNull();
    });
  });

  describe('error handling', () => {
    it('reports error for missing SELECT', () => {
      const result = parseSQL('FROM Student');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('provides AST for valid prefix even with trailing errors', () => {
      const result = parseSQL('SELECT name');
      // This is valid SQL (SELECT without FROM is permitted)
      expect(result.ast).not.toBeNull();
    });
  });

  describe('source locations', () => {
    it('preserves location info on AST nodes', () => {
      const result = parseSQL('SELECT name FROM Student');
      expect(result.ast!.location).toBeDefined();
      expect(result.ast!.select.location).toBeDefined();
      expect(result.ast!.select.location.line).toBe(1);
    });
  });
});
