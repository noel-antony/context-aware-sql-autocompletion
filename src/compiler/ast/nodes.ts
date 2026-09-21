/**
 * Abstract Syntax Tree Node Definitions
 *
 * Strongly typed, discriminated-union AST nodes for the supported SQL subset.
 * Every node carries source-location information for diagnostics and editor mapping.
 */

// ─── Source Location ───────────────────────────────────────────────

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
  length: number;
}

// ─── AST Node Types ────────────────────────────────────────────────

export type ASTNodeType =
  | 'Query'
  | 'SelectClause'
  | 'SelectItem'
  | 'FromClause'
  | 'TableReference'
  | 'JoinClause'
  | 'WhereClause'
  | 'GroupByClause'
  | 'HavingClause'
  | 'OrderByClause'
  | 'OrderItem'
  | 'LimitClause'
  | 'ColumnReference'
  | 'Literal'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'IsNullExpression'
  | 'ParenExpression';

// ─── Base AST Node ─────────────────────────────────────────────────

export interface BaseNode {
  type: ASTNodeType;
  location: SourceLocation;
}

// ─── Expression Nodes ──────────────────────────────────────────────

export interface ColumnReferenceNode extends BaseNode {
  type: 'ColumnReference';
  /** Table name or alias qualifier (e.g., "s" in "s.name") */
  table: string | null;
  /** Column name (e.g., "name" in "s.name") */
  column: string;
}

export type LiteralType = 'integer' | 'decimal' | 'string' | 'boolean' | 'null';

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  literalType: LiteralType;
  value: string;
}

export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  left: ExpressionNode;
  operator: string;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: 'NOT';
  operand: ExpressionNode;
}

export interface IsNullExpressionNode extends BaseNode {
  type: 'IsNullExpression';
  operand: ExpressionNode;
  negated: boolean; // IS NOT NULL → true
}

export interface ParenExpressionNode extends BaseNode {
  type: 'ParenExpression';
  expression: ExpressionNode;
}

export type ExpressionNode =
  | ColumnReferenceNode
  | LiteralNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | IsNullExpressionNode
  | ParenExpressionNode;

// ─── Clause Nodes ──────────────────────────────────────────────────

export interface SelectItemNode extends BaseNode {
  type: 'SelectItem';
  expression: ExpressionNode | '*';
  alias: string | null;
}

export interface SelectClauseNode extends BaseNode {
  type: 'SelectClause';
  distinct: boolean;
  items: SelectItemNode[];
}

export interface TableReferenceNode extends BaseNode {
  type: 'TableReference';
  tableName: string;
  alias: string | null;
}

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'JOIN';

export interface JoinClauseNode extends BaseNode {
  type: 'JoinClause';
  joinType: JoinType;
  table: TableReferenceNode;
  condition: ExpressionNode | null;
}

export interface FromClauseNode extends BaseNode {
  type: 'FromClause';
  table: TableReferenceNode;
  joins: JoinClauseNode[];
}

export interface WhereClauseNode extends BaseNode {
  type: 'WhereClause';
  condition: ExpressionNode;
}

export interface GroupByClauseNode extends BaseNode {
  type: 'GroupByClause';
  columns: ColumnReferenceNode[];
}

export interface HavingClauseNode extends BaseNode {
  type: 'HavingClause';
  condition: ExpressionNode;
}

export interface OrderItemNode extends BaseNode {
  type: 'OrderItem';
  column: ColumnReferenceNode;
  direction: 'ASC' | 'DESC' | null;
}

export interface OrderByClauseNode extends BaseNode {
  type: 'OrderByClause';
  items: OrderItemNode[];
}

export interface LimitClauseNode extends BaseNode {
  type: 'LimitClause';
  count: ExpressionNode;
}

// ─── Query Node (root) ────────────────────────────────────────────

export interface QueryNode extends BaseNode {
  type: 'Query';
  select: SelectClauseNode;
  from: FromClauseNode | null;
  where: WhereClauseNode | null;
  groupBy: GroupByClauseNode | null;
  having: HavingClauseNode | null;
  orderBy: OrderByClauseNode | null;
  limit: LimitClauseNode | null;
}

// ─── Union of all nodes ────────────────────────────────────────────

export type ASTNode =
  | QueryNode
  | SelectClauseNode
  | SelectItemNode
  | FromClauseNode
  | TableReferenceNode
  | JoinClauseNode
  | WhereClauseNode
  | GroupByClauseNode
  | HavingClauseNode
  | OrderByClauseNode
  | OrderItemNode
  | LimitClauseNode
  | ExpressionNode;
