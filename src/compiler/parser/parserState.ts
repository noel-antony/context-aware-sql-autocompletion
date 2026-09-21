/**
 * Parser State Definitions
 *
 * Explicit enumeration of all parser states used by the prefix parser
 * to determine the completion context at any cursor position in a
 * partially typed SQL query.
 */

// ─── Parser State Enum ────────────────────────────────────────────

export enum ParserState {
  /** Initial state — no tokens consumed */
  START = 'START',

  /** Just consumed SELECT keyword */
  AFTER_SELECT = 'AFTER_SELECT',

  /** Inside SELECT list — expecting columns, *, or expressions */
  SELECT_LIST = 'SELECT_LIST',

  /** Just finished a select item — expecting comma, FROM, or clause */
  AFTER_SELECT_ITEM = 'AFTER_SELECT_ITEM',

  /** Expecting FROM keyword after SELECT list */
  EXPECT_FROM = 'EXPECT_FROM',

  /** Inside FROM — expecting table name */
  FROM_TABLE = 'FROM_TABLE',

  /** Just finished FROM table — expecting alias, JOIN, WHERE, etc. */
  AFTER_FROM_TABLE = 'AFTER_FROM_TABLE',

  /** Expecting JOIN, WHERE, GROUP BY, ORDER BY, LIMIT, or EOF */
  EXPECT_JOIN_OR_CLAUSE = 'EXPECT_JOIN_OR_CLAUSE',

  /** Inside JOIN — expecting table name */
  JOIN_TABLE = 'JOIN_TABLE',

  /** Just finished JOIN table — expecting alias or ON */
  JOIN_AFTER_TABLE = 'JOIN_AFTER_TABLE',

  /** Expecting ON keyword after JOIN table */
  EXPECT_ON = 'EXPECT_ON',

  /** Inside JOIN ON condition */
  JOIN_CONDITION = 'JOIN_CONDITION',

  /** Right after WHERE keyword — expecting expression start */
  WHERE_START = 'WHERE_START',

  /** Expecting left operand in WHERE condition */
  WHERE_OPERAND = 'WHERE_OPERAND',

  /** Expecting operator after left operand */
  WHERE_OPERATOR = 'WHERE_OPERATOR',

  /** Expecting right operand after operator */
  WHERE_RIGHT_OPERAND = 'WHERE_RIGHT_OPERAND',

  /** Expecting AND/OR or clause end */
  WHERE_BOOLEAN_OPERATOR = 'WHERE_BOOLEAN_OPERATOR',

  /** Right after GROUP BY — expecting column reference */
  GROUP_BY_START = 'GROUP_BY_START',

  /** Inside GROUP BY column list */
  GROUP_BY_COLUMN = 'GROUP_BY_COLUMN',

  /** After GROUP BY column - expecting comma or next clause */
  AFTER_GROUP_BY_COLUMN = 'AFTER_GROUP_BY_COLUMN',

  /** Right after HAVING — expecting condition */
  HAVING_START = 'HAVING_START',

  /** Inside HAVING condition */
  HAVING_CONDITION = 'HAVING_CONDITION',

  /** Right after ORDER BY — expecting column reference */
  ORDER_BY_START = 'ORDER_BY_START',

  /** Inside ORDER BY column list */
  ORDER_BY_COLUMN = 'ORDER_BY_COLUMN',

  /** After ORDER BY column — expecting ASC/DESC, comma, or next clause */
  ORDER_DIRECTION = 'ORDER_DIRECTION',

  /** Right after LIMIT keyword — expecting integer */
  LIMIT_START = 'LIMIT_START',

  /** Expecting integer value for LIMIT */
  LIMIT_VALUE = 'LIMIT_VALUE',

  /** Query is syntactically complete */
  QUERY_COMPLETE = 'QUERY_COMPLETE',

  /** After a dot — expecting qualified column name */
  DOT_ACCESS = 'DOT_ACCESS',

  /** Recovery state for unsupported/unknown constructs */
  UNKNOWN_RECOVERY = 'UNKNOWN_RECOVERY',
}

// ─── Active Clause ────────────────────────────────────────────────

export enum ActiveClause {
  NONE = 'NONE',
  SELECT = 'SELECT',
  FROM = 'FROM',
  JOIN = 'JOIN',
  ON = 'ON',
  WHERE = 'WHERE',
  GROUP_BY = 'GROUP_BY',
  HAVING = 'HAVING',
  ORDER_BY = 'ORDER_BY',
  LIMIT = 'LIMIT',
}

// ─── Alias Entry ──────────────────────────────────────────────────

export interface AliasEntry {
  alias: string;
  tableName: string;
}

// ─── Completion Context Result ────────────────────────────────────

export interface CompletionContextResult {
  /** Current parser state */
  parserState: ParserState;

  /** Token types that would be valid next */
  expectedTokenKinds: string[];

  /** Specific keywords that would be valid next */
  expectedKeywords: string[];

  /** Which SQL clause is currently active */
  activeClause: ActiveClause;

  /** Table aliases visible in the current scope */
  activeAliases: AliasEntry[];

  /** Tables referenced directly (without alias) */
  activeTables: string[];

  /** The partial text the user is currently typing (for prefix matching) */
  currentPrefix: string;

  /** The qualifier before a dot (e.g., "s" in "s.") if any */
  dotQualifier: string | null;

  /** Index of cursor in token stream */
  tokenIndex: number;

  /** Any diagnostics produced during prefix parsing */
  diagnostics: string[];
}
