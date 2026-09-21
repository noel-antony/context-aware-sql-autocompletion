/**
 * Diagnostics Types
 *
 * Structured diagnostic messages for errors, warnings, and info
 * produced by the lexer, parser, and semantic analyzer.
 */

import { SourceSpan } from '../lexer/token';

// ─── Diagnostic Severity ──────────────────────────────────────────

export enum DiagnosticSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

// ─── Diagnostic Code ──────────────────────────────────────────────

export enum DiagnosticCode {
  // Lexer
  UNKNOWN_CHARACTER = 'UNKNOWN_CHARACTER',
  UNTERMINATED_STRING = 'UNTERMINATED_STRING',

  // Parser
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  UNSUPPORTED_CONSTRUCT = 'UNSUPPORTED_CONSTRUCT',

  // Semantic — Tables
  UNKNOWN_TABLE = 'UNKNOWN_TABLE',
  DUPLICATE_ALIAS = 'DUPLICATE_ALIAS',

  // Semantic — Columns
  UNKNOWN_COLUMN = 'UNKNOWN_COLUMN',
  AMBIGUOUS_COLUMN = 'AMBIGUOUS_COLUMN',
  INVALID_QUALIFIED_COLUMN = 'INVALID_QUALIFIED_COLUMN',
  UNKNOWN_ALIAS = 'UNKNOWN_ALIAS',

  // Semantic — Types
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  INVALID_BOOLEAN_EXPRESSION = 'INVALID_BOOLEAN_EXPRESSION',
  INVALID_LIKE_TYPE = 'INVALID_LIKE_TYPE',
  INVALID_LIMIT_TYPE = 'INVALID_LIMIT_TYPE',

  // Semantic — GROUP BY
  INVALID_GROUP_BY = 'INVALID_GROUP_BY',

  // General
  GENERAL_ERROR = 'GENERAL_ERROR',
}

// ─── Diagnostic ───────────────────────────────────────────────────

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  code: DiagnosticCode;
  span: SourceSpan | null;
  suggestion?: string;
}

// ─── Diagnostic Collection ────────────────────────────────────────

export class DiagnosticCollection {
  private items: Diagnostic[] = [];

  add(diagnostic: Diagnostic): void {
    this.items.push(diagnostic);
  }

  error(message: string, code: DiagnosticCode, span: SourceSpan | null, suggestion?: string): void {
    this.items.push({
      severity: DiagnosticSeverity.ERROR,
      message,
      code,
      span,
      suggestion,
    });
  }

  warning(message: string, code: DiagnosticCode, span: SourceSpan | null, suggestion?: string): void {
    this.items.push({
      severity: DiagnosticSeverity.WARNING,
      message,
      code,
      span,
      suggestion,
    });
  }

  info(message: string, code: DiagnosticCode, span: SourceSpan | null, suggestion?: string): void {
    this.items.push({
      severity: DiagnosticSeverity.INFO,
      message,
      code,
      span,
      suggestion,
    });
  }

  getAll(): Diagnostic[] {
    return [...this.items];
  }

  getErrors(): Diagnostic[] {
    return this.items.filter(d => d.severity === DiagnosticSeverity.ERROR);
  }

  getWarnings(): Diagnostic[] {
    return this.items.filter(d => d.severity === DiagnosticSeverity.WARNING);
  }

  hasErrors(): boolean {
    return this.items.some(d => d.severity === DiagnosticSeverity.ERROR);
  }

  clear(): void {
    this.items = [];
  }
}
