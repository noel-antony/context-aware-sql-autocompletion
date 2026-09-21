/**
 * SQL Lexical Analyzer
 *
 * Scans raw SQL text character-by-character and produces a stream of tokens.
 * Tracks line, column, and character offsets for every token.
 * Recognizes keywords case-insensitively, handles string literals,
 * numeric literals, identifiers, operators, and punctuation.
 *
 * Malformed input (unclosed strings, unknown characters) is captured
 * as UNKNOWN tokens with diagnostic information rather than throwing.
 */

import { Token, TokenType, SQL_KEYWORDS } from './token';

// ─── Lexer Diagnostic ─────────────────────────────────────────────

export interface LexerDiagnostic {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}

// ─── Lexer Result ─────────────────────────────────────────────────

export interface LexerResult {
  tokens: Token[];
  diagnostics: LexerDiagnostic[];
}

// ─── Lexer Implementation ─────────────────────────────────────────

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private diagnostics: LexerDiagnostic[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input and return all tokens plus diagnostics.
   */
  tokenize(): LexerResult {
    while (this.pos < this.input.length) {
      this.skipWhitespace();

      if (this.pos >= this.input.length) break;

      const ch = this.input[this.pos];

      // Single-line comments: -- ...
      if (ch === '-' && this.peek(1) === '-') {
        this.skipLineComment();
        continue;
      }

      // String literal
      if (ch === "'") {
        this.readString();
        continue;
      }

      // Number
      if (this.isDigit(ch)) {
        this.readNumber();
        continue;
      }

      // Identifier or keyword
      if (this.isIdentStart(ch)) {
        this.readIdentifierOrKeyword();
        continue;
      }

      // Two-character operators
      if (ch === '!' && this.peek(1) === '=') {
        this.addToken(TokenType.OPERATOR, '!=', 2);
        continue;
      }
      if (ch === '<' && this.peek(1) === '>') {
        this.addToken(TokenType.OPERATOR, '<>', 2);
        continue;
      }
      if (ch === '<' && this.peek(1) === '=') {
        this.addToken(TokenType.OPERATOR, '<=', 2);
        continue;
      }
      if (ch === '>' && this.peek(1) === '=') {
        this.addToken(TokenType.OPERATOR, '>=', 2);
        continue;
      }

      // Single-character operators and punctuation
      switch (ch) {
        case '=':
          this.addToken(TokenType.OPERATOR, '=', 1);
          break;
        case '<':
          this.addToken(TokenType.OPERATOR, '<', 1);
          break;
        case '>':
          this.addToken(TokenType.OPERATOR, '>', 1);
          break;
        case ',':
          this.addToken(TokenType.COMMA, ',', 1);
          break;
        case '.':
          this.addToken(TokenType.DOT, '.', 1);
          break;
        case '(':
          this.addToken(TokenType.LPAREN, '(', 1);
          break;
        case ')':
          this.addToken(TokenType.RPAREN, ')', 1);
          break;
        case '*':
          this.addToken(TokenType.STAR, '*', 1);
          break;
        case ';':
          this.addToken(TokenType.SEMICOLON, ';', 1);
          break;
        default:
          // Unknown character
          this.diagnostics.push({
            message: `Unknown character: '${ch}'`,
            line: this.line,
            column: this.column,
            offset: this.pos,
            length: 1,
          });
          this.addToken(TokenType.UNKNOWN, ch, 1);
          break;
      }
    }

    // Always end with EOF
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      upperValue: '',
      line: this.line,
      column: this.column,
      offset: this.pos,
      length: 0,
    });

    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  // ─── Internal Helpers ─────────────────────────────────────────

  private peek(offset: number = 0): string | undefined {
    return this.input[this.pos + offset];
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }

  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && this.isWhitespace(this.input[this.pos])) {
      if (this.input[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  private skipLineComment(): void {
    // Skip past --
    this.pos += 2;
    this.column += 2;
    while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
      this.pos++;
      this.column++;
    }
  }

  private addToken(type: TokenType, value: string, length: number): void {
    this.tokens.push({
      type,
      value,
      upperValue: value.toUpperCase(),
      line: this.line,
      column: this.column,
      offset: this.pos,
      length,
    });
    this.pos += length;
    this.column += length;
  }

  private readString(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startPos = this.pos;

    // Skip opening quote
    this.pos++;
    this.column++;

    let value = "'";
    let closed = false;

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      if (ch === "'") {
        // Check for escaped quote ('')
        if (this.peek(1) === "'") {
          value += "''";
          this.pos += 2;
          this.column += 2;
        } else {
          value += "'";
          this.pos++;
          this.column++;
          closed = true;
          break;
        }
      } else if (ch === '\n') {
        value += ch;
        this.pos++;
        this.line++;
        this.column = 1;
      } else {
        value += ch;
        this.pos++;
        this.column++;
      }
    }

    const length = this.pos - startPos;

    if (!closed) {
      this.diagnostics.push({
        message: 'Unterminated string literal',
        line: startLine,
        column: startCol,
        offset: startPos,
        length,
      });
      this.tokens.push({
        type: TokenType.UNKNOWN,
        value,
        upperValue: value.toUpperCase(),
        line: startLine,
        column: startCol,
        offset: startPos,
        length,
      });
    } else {
      this.tokens.push({
        type: TokenType.STRING,
        value,
        upperValue: value.toUpperCase(),
        line: startLine,
        column: startCol,
        offset: startPos,
        length,
      });
    }
  }

  private readNumber(): void {
    const startPos = this.pos;
    const startCol = this.column;
    let isDecimal = false;

    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      this.pos++;
      this.column++;
    }

    // Check for decimal point
    if (this.pos < this.input.length && this.input[this.pos] === '.' && this.peek(1) !== undefined && this.isDigit(this.peek(1)!)) {
      isDecimal = true;
      this.pos++;
      this.column++;
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
        this.pos++;
        this.column++;
      }
    }

    const value = this.input.slice(startPos, this.pos);
    const length = this.pos - startPos;

    this.tokens.push({
      type: isDecimal ? TokenType.DECIMAL : TokenType.INTEGER,
      value,
      upperValue: value,
      line: this.line,
      column: startCol,
      offset: startPos,
      length,
    });
  }

  private readIdentifierOrKeyword(): void {
    const startPos = this.pos;
    const startCol = this.column;

    while (this.pos < this.input.length && this.isIdentPart(this.input[this.pos])) {
      this.pos++;
      this.column++;
    }

    const value = this.input.slice(startPos, this.pos);
    const upper = value.toUpperCase();
    const length = this.pos - startPos;
    const type = SQL_KEYWORDS.has(upper) ? TokenType.KEYWORD : TokenType.IDENTIFIER;

    this.tokens.push({
      type,
      value,
      upperValue: upper,
      line: this.line,
      column: startCol,
      offset: startPos,
      length,
    });
  }
}

// ─── Convenience function ──────────────────────────────────────────

/**
 * Tokenize a SQL string and return the result.
 */
export function tokenize(input: string): LexerResult {
  return new Lexer(input).tokenize();
}
