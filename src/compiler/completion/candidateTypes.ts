/**
 * Completion Candidate Types
 *
 * Typed structures for completion candidates produced by the
 * candidate generator and scored by the ranking engine.
 */

// ─── Candidate Kind ───────────────────────────────────────────────

export enum CandidateKind {
  KEYWORD = 'KEYWORD',
  TABLE = 'TABLE',
  ALIAS = 'ALIAS',
  COLUMN = 'COLUMN',
  OPERATOR = 'OPERATOR',
  LITERAL = 'LITERAL',
  CLAUSE = 'CLAUSE',
  DIRECTION = 'DIRECTION',
  STAR = 'STAR',
}

// ─── Completion Candidate ─────────────────────────────────────────

export interface CompletionCandidate {
  /** Display label for the candidate */
  label: string;

  /** Text to insert when the candidate is accepted */
  insertText: string;

  /** Kind of candidate (for icon/categorization) */
  kind: CandidateKind;

  /** Short description (e.g., type info, table name) */
  detail: string;

  /** Source of the candidate (grammar, schema, etc.) */
  source: 'grammar' | 'schema' | 'symbol_table';

  // ─── Scoring Fields ──────────────────────────────────────────

  /** Score based on syntactic validity in current parser state [0, 1] */
  syntaxScore: number;

  /** Score based on semantic resolution (schema/symbol table) [0, 1] */
  semanticScore: number;

  /** Score based on type compatibility [0, 1] */
  typeScore: number;

  /** Score based on clause-specific context relevance [0, 1] */
  contextScore: number;

  /** Score based on prefix matching [0, 1] */
  prefixScore: number;

  /** Final weighted score [0, 1] */
  finalScore: number;

  /** Human-readable explanation of why this candidate was ranked here */
  explanation: string;
}

// ─── Candidate Source Info ─────────────────────────────────────────

export interface CandidateSourceInfo {
  /** The table this column belongs to, if applicable */
  tableName?: string;
  /** The alias used, if applicable */
  aliasName?: string;
  /** The column type, if applicable */
  columnType?: string;
  /** Whether this is a primary key */
  isPrimaryKey?: boolean;
}
