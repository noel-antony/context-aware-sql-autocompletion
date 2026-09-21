/**
 * Token Types for the SQL Lexer
 *
 * Defines all token categories recognized by the lexical analyzer.
 * Each token carries its type, original text, position information,
 * and a normalized uppercase value for case-insensitive keyword matching.
 */

// ─── Token Type Enum ───────────────────────────────────────────────

export enum TokenType {
  /** SQL keyword (SELECT, FROM, WHERE, etc.) */
  KEYWORD = 'KEYWORD',
  /** User-defined identifier (table name, column name, alias) */
  IDENTIFIER = 'IDENTIFIER',
  /** Integer literal (e.g. 42) */
  INTEGER = 'INTEGER',
  /** Decimal literal (e.g. 3.14) */
  DECIMAL = 'DECIMAL',
  /** String literal (e.g. 'hello') */
  STRING = 'STRING',
  /** Comparison or assignment operator (=, !=, <>, <, <=, >, >=) */
  OPERATOR = 'OPERATOR',
  /** Comma separator */
  COMMA = 'COMMA',
  /** Dot for qualified references (table.column) */
  DOT = 'DOT',
  /** Left parenthesis */
  LPAREN = 'LPAREN',
  /** Right parenthesis */
  RPAREN = 'RPAREN',
  /** Asterisk / star (SELECT *) */
  STAR = 'STAR',
  /** Semicolon (statement terminator) */
  SEMICOLON = 'SEMICOLON',
  /** End of input */
  EOF = 'EOF',
  /** Unrecognized character or malformed token */
  UNKNOWN = 'UNKNOWN',
}

// ─── SQL Keywords ──────────────────────────────────────────────────

/**
 * Complete set of SQL keywords supported by this compiler.
 * All comparisons are case-insensitive (via uppercased lookup).
 */
export const SQL_KEYWORDS: ReadonlySet<string> = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'ON',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'AND',
  'OR',
  'NOT',
  'IS',
  'NULL',
  'LIKE',
  'TRUE',
  'FALSE',
  'AS',
  'DISTINCT',
]);

// ─── Token Interface ───────────────────────────────────────────────

/**
 * Represents a single token produced by the lexer.
 *
 * Every token carries full positional information so that
 * diagnostics, the prefix parser, and the editor can map
 * tokens back to exact source locations.
 */
export interface Token {
  /** The classified type of this token */
  type: TokenType;

  /** The original text as it appeared in the source */
  value: string;

  /**
   * Uppercased value for case-insensitive comparisons.
   * For keywords, this matches the canonical keyword spelling.
   * For identifiers/literals, this is simply the uppercased text.
   */
  upperValue: string;

  /** 1-based line number where this token starts */
  line: number;

  /** 1-based column number where this token starts */
  column: number;

  /** 0-based character offset from the start of the input */
  offset: number;

  /** Length of the token in characters */
  length: number;
}

// ─── Token Span ────────────────────────────────────────────────────

/**
 * Source span extracted from a token, used for diagnostics.
 */
export interface SourceSpan {
  line: number;
  column: number;
  offset: number;
  length: number;
}

/**
 * Extract the source span from a token.
 */
export function tokenSpan(token: Token): SourceSpan {
  return {
    line: token.line,
    column: token.column,
    offset: token.offset,
    length: token.length,
  };
}

// ─── Helper: Check if a token is a specific keyword ────────────────

export function isKeyword(token: Token, keyword: string): boolean {
  return token.type === TokenType.KEYWORD && token.upperValue === keyword.toUpperCase();
}

// ─── Helper: Check if a token is any of the given keywords ─────────

export function isAnyKeyword(token: Token, keywords: string[]): boolean {
  return token.type === TokenType.KEYWORD && keywords.some(k => token.upperValue === k.toUpperCase());
}
