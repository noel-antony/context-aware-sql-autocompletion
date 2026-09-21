/**
 * Completion Context Engine
 *
 * Transforms the prefix parser output + schema + symbol table
 * into a rich completion context that determines which candidate
 * kinds are valid for the current cursor position.
 */

import { ParserState, ActiveClause, CompletionContextResult } from '../parser/parserState';
import { ColumnType } from '../../schema/schemaTypes';

// ─── Expected Candidate Categories ────────────────────────────────

export interface CompletionExpectation {
  /** Should we show keywords? */
  expectKeywords: boolean;
  /** Specific keywords to show */
  keywords: string[];
  /** Should we show table names? */
  expectTables: boolean;
  /** Should we show column references? */
  expectColumns: boolean;
  /** Should we show aliases? */
  expectAliases: boolean;
  /** Should we show * (star)? */
  expectStar: boolean;
  /** Should we show operators? */
  expectOperators: boolean;
  /** Should we show literals? */
  expectLiterals: boolean;
  /** Should we show direction (ASC/DESC)? */
  expectDirection: boolean;
  /** Expected data type (for type-aware filtering) */
  expectedType: ColumnType | null;
  /** Should we show only columns for a specific qualifier? */
  qualifierFilter: string | null;
}

// ─── Build Completion Expectation ─────────────────────────────────

export function buildCompletionExpectation(context: CompletionContextResult): CompletionExpectation {
  const base: CompletionExpectation = {
    expectKeywords: false,
    keywords: [],
    expectTables: false,
    expectColumns: false,
    expectAliases: false,
    expectStar: false,
    expectOperators: false,
    expectLiterals: false,
    expectDirection: false,
    expectedType: null,
    qualifierFilter: context.dotQualifier,
  };

  switch (context.parserState) {
    case ParserState.START:
      base.expectKeywords = true;
      base.keywords = ['SELECT'];
      break;

    case ParserState.AFTER_SELECT:
    case ParserState.SELECT_LIST:
      base.expectColumns = true;
      base.expectStar = true;
      base.expectAliases = true;
      base.expectKeywords = true;
      base.keywords = ['DISTINCT'];
      break;

    case ParserState.AFTER_SELECT_ITEM:
      base.expectKeywords = true;
      base.keywords = ['FROM', 'AS'];
      break;

    case ParserState.EXPECT_FROM:
      base.expectKeywords = true;
      base.keywords = ['FROM'];
      break;

    case ParserState.FROM_TABLE:
      base.expectTables = true;
      break;

    case ParserState.AFTER_FROM_TABLE:
      base.expectKeywords = true;
      base.keywords = ['AS', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'WHERE', 'GROUP', 'ORDER', 'LIMIT'];
      break;

    case ParserState.EXPECT_JOIN_OR_CLAUSE:
      base.expectKeywords = true;
      base.keywords = ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'];
      break;

    case ParserState.JOIN_TABLE:
      base.expectTables = true;
      break;

    case ParserState.JOIN_AFTER_TABLE:
      base.expectKeywords = true;
      base.keywords = ['AS', 'ON'];
      break;

    case ParserState.EXPECT_ON:
      base.expectKeywords = true;
      base.keywords = ['ON'];
      break;

    case ParserState.JOIN_CONDITION:
      base.expectColumns = true;
      base.expectAliases = true;
      base.expectOperators = true;
      base.expectKeywords = true;
      base.keywords = ['AND', 'OR'];
      break;

    case ParserState.WHERE_START:
    case ParserState.WHERE_OPERAND:
      base.expectColumns = true;
      base.expectAliases = true;
      base.expectLiterals = true;
      base.expectKeywords = true;
      base.keywords = ['NOT', 'NULL', 'TRUE', 'FALSE'];
      break;

    case ParserState.WHERE_OPERATOR:
      base.expectOperators = true;
      base.expectKeywords = true;
      base.keywords = ['IS', 'LIKE', 'AND', 'OR'];
      break;

    case ParserState.WHERE_RIGHT_OPERAND:
      base.expectColumns = true;
      base.expectAliases = true;
      base.expectLiterals = true;
      base.expectKeywords = true;
      base.keywords = ['NULL', 'TRUE', 'FALSE'];
      break;

    case ParserState.WHERE_BOOLEAN_OPERATOR:
      base.expectKeywords = true;
      base.keywords = ['AND', 'OR', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'];
      break;

    case ParserState.GROUP_BY_START:
    case ParserState.GROUP_BY_COLUMN:
      base.expectColumns = true;
      base.expectAliases = true;
      break;

    case ParserState.AFTER_GROUP_BY_COLUMN:
      base.expectKeywords = true;
      base.keywords = ['HAVING', 'ORDER', 'LIMIT'];
      break;

    case ParserState.HAVING_START:
    case ParserState.HAVING_CONDITION:
      base.expectColumns = true;
      base.expectAliases = true;
      base.expectOperators = true;
      base.expectLiterals = true;
      base.expectKeywords = true;
      base.keywords = ['NOT', 'NULL', 'TRUE', 'FALSE', 'AND', 'OR', 'IS', 'LIKE'];
      break;

    case ParserState.ORDER_BY_START:
    case ParserState.ORDER_BY_COLUMN:
      base.expectColumns = true;
      base.expectAliases = true;
      break;

    case ParserState.ORDER_DIRECTION:
      base.expectDirection = true;
      base.expectKeywords = true;
      base.keywords = ['ASC', 'DESC', 'LIMIT'];
      break;

    case ParserState.LIMIT_START:
    case ParserState.LIMIT_VALUE:
      base.expectLiterals = true;
      base.expectedType = ColumnType.INT;
      break;

    case ParserState.DOT_ACCESS:
      base.expectColumns = true;
      break;

    case ParserState.QUERY_COMPLETE:
      // No suggestions
      break;
  }

  return base;
}
