/**
 * Recursive-Descent SQL Parser
 *
 * Parses complete SQL queries according to the supported grammar.
 * Produces a typed AST and reports syntax errors with expected-token information.
 * Does NOT perform semantic analysis — that is handled separately.
 */

import { Token, TokenType, isKeyword, isAnyKeyword } from '../lexer/token';
import { tokenize } from '../lexer/lexer';
import {
  QueryNode,
  SelectClauseNode,
  SelectItemNode,
  FromClauseNode,
  TableReferenceNode,
  JoinClauseNode,
  JoinType,
  WhereClauseNode,
  GroupByClauseNode,
  HavingClauseNode,
  OrderByClauseNode,
  OrderItemNode,
  LimitClauseNode,
  ExpressionNode,
  ColumnReferenceNode,
  LiteralNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IsNullExpressionNode,
  ParenExpressionNode,
  SourceLocation,
} from '../ast/nodes';

// ─── Parser Error ─────────────────────────────────────────────────

export interface ParseError {
  message: string;
  line: number;
  column: number;
  offset: number;
  expected?: string[];
  got?: string;
}

// ─── Parser Result ────────────────────────────────────────────────

export interface ParseResult {
  ast: QueryNode | null;
  errors: ParseError[];
}

// ─── Parser ───────────────────────────────────────────────────────

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    try {
      const ast = this.parseQuery();
      return { ast, errors: this.errors };
    } catch {
      return { ast: null, errors: this.errors };
    }
  }

  // ─── Token Navigation ────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  private peek(offset: number = 0): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.current();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return token;
  }

  private expectKeyword(keyword: string): Token {
    const token = this.current();
    if (!isKeyword(token, keyword)) {
      this.addError(`Expected '${keyword}'`, [keyword]);
      throw new Error(`Expected '${keyword}'`);
    }
    return this.advance();
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      this.addError(`Expected ${type}`, [type]);
      throw new Error(`Expected ${type}`);
    }
    return this.advance();
  }

  private addError(message: string, expected?: string[]): void {
    const token = this.current();
    this.errors.push({
      message: `${message}, got '${token.value || 'EOF'}' at line ${token.line}:${token.column}`,
      line: token.line,
      column: token.column,
      offset: token.offset,
      expected,
      got: token.value || 'EOF',
    });
  }

  private locationFrom(token: Token): SourceLocation {
    return {
      line: token.line,
      column: token.column,
      offset: token.offset,
      length: token.length,
    };
  }

  private spanLocation(start: Token, end: Token): SourceLocation {
    return {
      line: start.line,
      column: start.column,
      offset: start.offset,
      length: (end.offset + end.length) - start.offset,
    };
  }

  // ─── Grammar Rules ───────────────────────────────────────────

  private parseQuery(): QueryNode {
    const startToken = this.current();

    const select = this.parseSelectClause();
    let from: FromClauseNode | null = null;
    let where: WhereClauseNode | null = null;
    let groupBy: GroupByClauseNode | null = null;
    let having: HavingClauseNode | null = null;
    let orderBy: OrderByClauseNode | null = null;
    let limit: LimitClauseNode | null = null;

    if (isKeyword(this.current(), 'FROM')) {
      from = this.parseFromClause();
    }

    if (isKeyword(this.current(), 'WHERE')) {
      where = this.parseWhereClause();
    }

    if (isKeyword(this.current(), 'GROUP')) {
      groupBy = this.parseGroupByClause();
    }

    if (isKeyword(this.current(), 'HAVING')) {
      having = this.parseHavingClause();
    }

    if (isKeyword(this.current(), 'ORDER')) {
      orderBy = this.parseOrderByClause();
    }

    if (isKeyword(this.current(), 'LIMIT')) {
      limit = this.parseLimitClause();
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    // Skip optional semicolon
    if (this.current().type === TokenType.SEMICOLON) {
      this.advance();
    }

    // Should be at EOF
    if (this.current().type !== TokenType.EOF) {
      this.addError('Unexpected token after query end');
    }

    return {
      type: 'Query',
      select,
      from,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      location: this.spanLocation(startToken, endToken),
    };
  }

  // ─── SELECT ──────────────────────────────────────────────────

  private parseSelectClause(): SelectClauseNode {
    const start = this.expectKeyword('SELECT');
    let distinct = false;

    if (isKeyword(this.current(), 'DISTINCT')) {
      this.advance();
      distinct = true;
    }

    const items: SelectItemNode[] = [];
    items.push(this.parseSelectItem());

    while (this.current().type === TokenType.COMMA) {
      this.advance(); // skip comma
      items.push(this.parseSelectItem());
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'SelectClause',
      distinct,
      items,
      location: this.spanLocation(start, endToken),
    };
  }

  private parseSelectItem(): SelectItemNode {
    const startToken = this.current();

    if (this.current().type === TokenType.STAR) {
      const star = this.advance();
      return {
        type: 'SelectItem',
        expression: '*',
        alias: null,
        location: this.locationFrom(star),
      };
    }

    const expr = this.parseExpression();
    let alias: string | null = null;

    if (isKeyword(this.current(), 'AS')) {
      this.advance();
      alias = this.expect(TokenType.IDENTIFIER).value;
    } else if (this.current().type === TokenType.IDENTIFIER && !isAnyKeyword(this.current(), ['FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'AND', 'OR'])) {
      alias = this.advance().value;
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'SelectItem',
      expression: expr,
      alias,
      location: this.spanLocation(startToken, endToken),
    };
  }

  // ─── FROM ────────────────────────────────────────────────────

  private parseFromClause(): FromClauseNode {
    const start = this.expectKeyword('FROM');
    const table = this.parseTableReference();
    const joins: JoinClauseNode[] = [];

    while (this.isJoinStart()) {
      joins.push(this.parseJoinClause());
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'FromClause',
      table,
      joins,
      location: this.spanLocation(start, endToken),
    };
  }

  private parseTableReference(): TableReferenceNode {
    const nameToken = this.expect(TokenType.IDENTIFIER);
    let alias: string | null = null;

    if (isKeyword(this.current(), 'AS')) {
      this.advance();
      alias = this.expect(TokenType.IDENTIFIER).value;
    } else if (this.current().type === TokenType.IDENTIFIER && !isAnyKeyword(this.current(), ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'])) {
      alias = this.advance().value;
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'TableReference',
      tableName: nameToken.value,
      alias,
      location: this.spanLocation(nameToken, endToken),
    };
  }

  private isJoinStart(): boolean {
    const curr = this.current();
    return isKeyword(curr, 'JOIN') ||
           isKeyword(curr, 'INNER') ||
           isKeyword(curr, 'LEFT') ||
           isKeyword(curr, 'RIGHT');
  }

  private parseJoinClause(): JoinClauseNode {
    const start = this.current();
    let joinType: JoinType = 'JOIN';

    if (isAnyKeyword(this.current(), ['INNER', 'LEFT', 'RIGHT'])) {
      joinType = this.advance().upperValue as JoinType;
    }

    this.expectKeyword('JOIN');
    const table = this.parseTableReference();
    let condition: ExpressionNode | null = null;

    if (isKeyword(this.current(), 'ON')) {
      this.advance();
      condition = this.parseCondition();
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'JoinClause',
      joinType,
      table,
      condition,
      location: this.spanLocation(start, endToken),
    };
  }

  // ─── WHERE ───────────────────────────────────────────────────

  private parseWhereClause(): WhereClauseNode {
    const start = this.expectKeyword('WHERE');
    const condition = this.parseCondition();
    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'WhereClause',
      condition,
      location: this.spanLocation(start, endToken),
    };
  }

  // ─── GROUP BY ────────────────────────────────────────────────

  private parseGroupByClause(): GroupByClauseNode {
    const start = this.expectKeyword('GROUP');
    this.expectKeyword('BY');

    const columns: ColumnReferenceNode[] = [];
    columns.push(this.parseColumnReference());

    while (this.current().type === TokenType.COMMA) {
      this.advance();
      columns.push(this.parseColumnReference());
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'GroupByClause',
      columns,
      location: this.spanLocation(start, endToken),
    };
  }

  // ─── HAVING ──────────────────────────────────────────────────

  private parseHavingClause(): HavingClauseNode {
    const start = this.expectKeyword('HAVING');
    const condition = this.parseCondition();
    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'HavingClause',
      condition,
      location: this.spanLocation(start, endToken),
    };
  }

  // ─── ORDER BY ────────────────────────────────────────────────

  private parseOrderByClause(): OrderByClauseNode {
    const start = this.expectKeyword('ORDER');
    this.expectKeyword('BY');

    const items: OrderItemNode[] = [];
    items.push(this.parseOrderItem());

    while (this.current().type === TokenType.COMMA) {
      this.advance();
      items.push(this.parseOrderItem());
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'OrderByClause',
      items,
      location: this.spanLocation(start, endToken),
    };
  }

  private parseOrderItem(): OrderItemNode {
    const col = this.parseColumnReference();
    let direction: 'ASC' | 'DESC' | null = null;

    if (isKeyword(this.current(), 'ASC')) {
      direction = 'ASC';
      this.advance();
    } else if (isKeyword(this.current(), 'DESC')) {
      direction = 'DESC';
      this.advance();
    }

    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'OrderItem',
      column: col,
      direction,
      location: this.spanLocation(this.tokens[this.pos > 0 ? this.pos - 1 : 0], endToken),
    };
  }

  // ─── LIMIT ───────────────────────────────────────────────────

  private parseLimitClause(): LimitClauseNode {
    const start = this.expectKeyword('LIMIT');
    const count = this.parsePrimary();
    const endToken = this.tokens[this.pos > 0 ? this.pos - 1 : 0];

    return {
      type: 'LimitClause',
      count,
      location: this.spanLocation(start, endToken),
    };
  }

  // ─── Condition / Expression Parsing ──────────────────────────

  private parseCondition(): ExpressionNode {
    return this.parseOrExpression();
  }

  private parseExpression(): ExpressionNode {
    return this.parseOrExpression();
  }

  private parseOrExpression(): ExpressionNode {
    let left = this.parseAndExpression();

    while (isKeyword(this.current(), 'OR')) {
      const opToken = this.advance();
      const right = this.parseAndExpression();
      left = {
        type: 'BinaryExpression',
        left,
        operator: 'OR',
        right,
        location: this.spanLocation(this.tokens[0], this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as BinaryExpressionNode;
    }

    return left;
  }

  private parseAndExpression(): ExpressionNode {
    let left = this.parseNotExpression();

    while (isKeyword(this.current(), 'AND')) {
      const opToken = this.advance();
      const right = this.parseNotExpression();
      left = {
        type: 'BinaryExpression',
        left,
        operator: 'AND',
        right,
        location: this.spanLocation(this.tokens[0], this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as BinaryExpressionNode;
    }

    return left;
  }

  private parseNotExpression(): ExpressionNode {
    if (isKeyword(this.current(), 'NOT')) {
      const notToken = this.advance();
      const operand = this.parseNotExpression();
      return {
        type: 'UnaryExpression',
        operator: 'NOT',
        operand,
        location: this.spanLocation(notToken, this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as UnaryExpressionNode;
    }

    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode {
    // Handle parenthesized expression
    if (this.current().type === TokenType.LPAREN) {
      const start = this.advance();
      const expr = this.parseCondition();
      this.expect(TokenType.RPAREN);
      return {
        type: 'ParenExpression',
        expression: expr,
        location: this.spanLocation(start, this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as ParenExpressionNode;
    }

    const left = this.parsePrimary();

    // IS [NOT] NULL
    if (isKeyword(this.current(), 'IS')) {
      this.advance();
      let negated = false;
      if (isKeyword(this.current(), 'NOT')) {
        this.advance();
        negated = true;
      }
      this.expectKeyword('NULL');
      return {
        type: 'IsNullExpression',
        operand: left,
        negated,
        location: this.spanLocation(this.tokens[0], this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as IsNullExpressionNode;
    }

    // Comparison operators
    if (this.isComparisonOperator()) {
      const op = this.advance();
      const right = this.parsePrimary();
      return {
        type: 'BinaryExpression',
        left,
        operator: op.upperValue,
        right,
        location: this.spanLocation(this.tokens[0], this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as BinaryExpressionNode;
    }

    // LIKE
    if (isKeyword(this.current(), 'LIKE')) {
      this.advance();
      const right = this.parsePrimary();
      return {
        type: 'BinaryExpression',
        left,
        operator: 'LIKE',
        right,
        location: this.spanLocation(this.tokens[0], this.tokens[this.pos > 0 ? this.pos - 1 : 0]),
      } as BinaryExpressionNode;
    }

    return left;
  }

  private isComparisonOperator(): boolean {
    const token = this.current();
    if (token.type !== TokenType.OPERATOR) return false;
    return ['=', '!=', '<>', '<', '<=', '>', '>='].includes(token.value);
  }

  private parsePrimary(): ExpressionNode {
    const token = this.current();

    // NULL
    if (isKeyword(token, 'NULL')) {
      this.advance();
      return {
        type: 'Literal',
        literalType: 'null',
        value: 'NULL',
        location: this.locationFrom(token),
      } as LiteralNode;
    }

    // TRUE / FALSE
    if (isKeyword(token, 'TRUE') || isKeyword(token, 'FALSE')) {
      this.advance();
      return {
        type: 'Literal',
        literalType: 'boolean',
        value: token.upperValue,
        location: this.locationFrom(token),
      } as LiteralNode;
    }

    // Integer
    if (token.type === TokenType.INTEGER) {
      this.advance();
      return {
        type: 'Literal',
        literalType: 'integer',
        value: token.value,
        location: this.locationFrom(token),
      } as LiteralNode;
    }

    // Decimal
    if (token.type === TokenType.DECIMAL) {
      this.advance();
      return {
        type: 'Literal',
        literalType: 'decimal',
        value: token.value,
        location: this.locationFrom(token),
      } as LiteralNode;
    }

    // String
    if (token.type === TokenType.STRING) {
      this.advance();
      return {
        type: 'Literal',
        literalType: 'string',
        value: token.value,
        location: this.locationFrom(token),
      } as LiteralNode;
    }

    // Identifier (possibly qualified column)
    if (token.type === TokenType.IDENTIFIER) {
      return this.parseColumnReference();
    }

    this.addError('Expected expression');
    throw new Error('Expected expression');
  }

  private parseColumnReference(): ColumnReferenceNode {
    const first = this.expect(TokenType.IDENTIFIER);

    if (this.current().type === TokenType.DOT) {
      this.advance();
      const second = this.expect(TokenType.IDENTIFIER);
      return {
        type: 'ColumnReference',
        table: first.value,
        column: second.value,
        location: this.spanLocation(first, second),
      };
    }

    return {
      type: 'ColumnReference',
      table: null,
      column: first.value,
      location: this.locationFrom(first),
    };
  }
}

// ─── Convenience ───────────────────────────────────────────────────

export function parseSQL(sql: string): ParseResult {
  const { tokens } = tokenize(sql);
  const parser = new Parser(tokens);
  return parser.parse();
}
