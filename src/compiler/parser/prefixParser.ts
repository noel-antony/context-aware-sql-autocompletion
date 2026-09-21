/**
 * Prefix Parser — Tolerant Parser for Incomplete SQL
 *
 * This is one of the most important components of the project.
 * Instead of throwing on incomplete/invalid SQL, this parser walks
 * through the available tokens and determines the current parser state,
 * what tokens are expected next, which clause is active, and what
 * aliases/tables are visible.
 *
 * The result is a CompletionContextResult that drives the entire
 * completion candidate generation system.
 */

import { Token, TokenType, isKeyword, isAnyKeyword } from '../lexer/token';
import { tokenize, LexerResult } from '../lexer/lexer';
import {
  ParserState,
  ActiveClause,
  AliasEntry,
  CompletionContextResult,
} from './parserState';

// ─── Prefix Parser ────────────────────────────────────────────────

export class PrefixParser {
  private tokens: Token[];
  private pos: number = 0;
  private state: ParserState = ParserState.START;
  private activeClause: ActiveClause = ActiveClause.NONE;
  private aliases: AliasEntry[] = [];
  private tables: string[] = [];
  private diagnostics: string[] = [];
  private cursorOffset: number;

  constructor(tokens: Token[], cursorOffset: number) {
    this.tokens = tokens;
    this.cursorOffset = cursorOffset;
  }

  /**
   * Analyze the token stream up to the cursor position
   * and return a structured completion context.
   */
  analyze(): CompletionContextResult {
    // Filter tokens up to cursor position (include tokens that start before cursor)
    const relevantTokens = this.tokens.filter(
      t => t.type !== TokenType.EOF && t.offset < this.cursorOffset
    );

    if (relevantTokens.length === 0) {
      return this.buildResult(ParserState.START, [], []);
    }

    // Walk through tokens tracking state transitions
    this.walkTokens(relevantTokens);

    // Determine expected tokens based on final state
    const { expectedKinds, expectedKeywords } = this.getExpected();

    return this.buildResult(this.state, expectedKinds, expectedKeywords);
  }

  // ─── Token Walking ───────────────────────────────────────────

  private walkTokens(tokens: Token[]): void {
    this.pos = 0;
    const len = tokens.length;

    while (this.pos < len) {
      const token = tokens[this.pos];

      switch (this.state) {
        case ParserState.START:
          this.handleStart(token);
          break;

        case ParserState.AFTER_SELECT:
        case ParserState.SELECT_LIST:
          this.handleSelectList(token, tokens);
          break;

        case ParserState.AFTER_SELECT_ITEM:
          this.handleAfterSelectItem(token);
          break;

        case ParserState.FROM_TABLE:
          this.handleFromTable(token);
          break;

        case ParserState.AFTER_FROM_TABLE:
          this.handleAfterFromTable(token, tokens);
          break;

        case ParserState.EXPECT_JOIN_OR_CLAUSE:
          this.handleExpectJoinOrClause(token);
          break;

        case ParserState.JOIN_TABLE:
          this.handleJoinTable(token);
          break;

        case ParserState.JOIN_AFTER_TABLE:
          this.handleJoinAfterTable(token, tokens);
          break;

        case ParserState.EXPECT_ON:
          this.handleExpectOn(token);
          break;

        case ParserState.JOIN_CONDITION:
          this.handleConditionTokens(token, tokens, ParserState.EXPECT_JOIN_OR_CLAUSE);
          break;

        case ParserState.WHERE_START:
        case ParserState.WHERE_OPERAND:
          this.handleConditionStart(token, tokens, 'WHERE');
          break;

        case ParserState.WHERE_OPERATOR:
          this.handleWhereOperator(token);
          break;

        case ParserState.WHERE_RIGHT_OPERAND:
          this.handleWhereRightOperand(token, tokens);
          break;

        case ParserState.WHERE_BOOLEAN_OPERATOR:
          this.handleWhereBooleanOperator(token);
          break;

        case ParserState.GROUP_BY_START:
        case ParserState.GROUP_BY_COLUMN:
          this.handleGroupByColumn(token, tokens);
          break;

        case ParserState.AFTER_GROUP_BY_COLUMN:
          this.handleAfterGroupByColumn(token);
          break;

        case ParserState.HAVING_START:
        case ParserState.HAVING_CONDITION:
          this.handleConditionStart(token, tokens, 'HAVING');
          break;

        case ParserState.ORDER_BY_START:
        case ParserState.ORDER_BY_COLUMN:
          this.handleOrderByColumn(token, tokens);
          break;

        case ParserState.ORDER_DIRECTION:
          this.handleOrderDirection(token);
          break;

        case ParserState.LIMIT_START:
        case ParserState.LIMIT_VALUE:
          this.handleLimitValue(token);
          break;

        case ParserState.DOT_ACCESS:
          this.handleDotAccess(token);
          break;

        default:
          this.pos++;
          break;
      }
    }
  }

  // ─── State Handlers ──────────────────────────────────────────

  private handleStart(token: Token): void {
    if (isKeyword(token, 'SELECT')) {
      this.state = ParserState.AFTER_SELECT;
      this.activeClause = ActiveClause.SELECT;
      this.pos++;
    } else {
      this.diagnostics.push(`Expected SELECT, got '${token.value}'`);
      this.state = ParserState.UNKNOWN_RECOVERY;
      this.pos++;
    }
  }

  private handleSelectList(token: Token, tokens: Token[]): void {
    this.activeClause = ActiveClause.SELECT;

    if (isKeyword(token, 'DISTINCT')) {
      this.pos++;
      this.state = ParserState.SELECT_LIST;
      return;
    }

    if (token.type === TokenType.STAR) {
      this.state = ParserState.AFTER_SELECT_ITEM;
      this.pos++;
      return;
    }

    if (token.type === TokenType.IDENTIFIER) {
      // Check for qualified reference: ident.ident
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          // Full qualified reference
          this.pos += 3;
          this.state = ParserState.AFTER_SELECT_ITEM;
          // Check for alias
          this.tryConsumeAlias(tokens);
          return;
        } else {
          // Dot access — incomplete
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2; // skip ident and dot
          return;
        }
      }

      // Simple identifier
      this.pos++;
      this.state = ParserState.AFTER_SELECT_ITEM;
      // Check for alias
      this.tryConsumeAlias(tokens);
      return;
    }

    // Literal in select
    if (this.isLiteral(token)) {
      this.pos++;
      this.state = ParserState.AFTER_SELECT_ITEM;
      this.tryConsumeAlias(tokens);
      return;
    }

    // If we see FROM, transition
    if (isKeyword(token, 'FROM')) {
      this.state = ParserState.FROM_TABLE;
      this.activeClause = ActiveClause.FROM;
      this.pos++;
      return;
    }

    this.pos++;
  }

  private handleAfterSelectItem(token: Token): void {
    if (token.type === TokenType.COMMA) {
      this.state = ParserState.SELECT_LIST;
      this.pos++;
      return;
    }

    if (isKeyword(token, 'FROM')) {
      this.state = ParserState.FROM_TABLE;
      this.activeClause = ActiveClause.FROM;
      this.pos++;
      return;
    }

    // Could be inline alias
    if (token.type === TokenType.IDENTIFIER && !this.isClauseKeyword(token)) {
      this.pos++;
      return;
    }

    // Transition to next clause
    this.handleClauseTransition(token);
  }

  private handleFromTable(token: Token): void {
    this.activeClause = ActiveClause.FROM;

    if (token.type === TokenType.IDENTIFIER) {
      this.tables.push(token.value);
      this.state = ParserState.AFTER_FROM_TABLE;
      this.pos++;
      return;
    }

    this.diagnostics.push(`Expected table name, got '${token.value}'`);
    this.pos++;
  }

  private handleAfterFromTable(token: Token, tokens: Token[]): void {
    // Check for alias: AS ident or just ident
    if (isKeyword(token, 'AS')) {
      this.pos++;
      if (this.pos < tokens.length && tokens[this.pos].type === TokenType.IDENTIFIER) {
        const aliasToken = tokens[this.pos];
        const tableName = this.tables[this.tables.length - 1];
        this.aliases.push({ alias: aliasToken.value, tableName });
        this.pos++;
      }
      this.state = ParserState.EXPECT_JOIN_OR_CLAUSE;
      return;
    }

    if (token.type === TokenType.IDENTIFIER && !this.isClauseKeyword(token)) {
      const tableName = this.tables[this.tables.length - 1];
      this.aliases.push({ alias: token.value, tableName });
      this.pos++;
      this.state = ParserState.EXPECT_JOIN_OR_CLAUSE;
      return;
    }

    this.state = ParserState.EXPECT_JOIN_OR_CLAUSE;
    this.handleExpectJoinOrClause(token);
  }

  private handleExpectJoinOrClause(token: Token): void {
    if (isAnyKeyword(token, ['INNER', 'LEFT', 'RIGHT'])) {
      this.activeClause = ActiveClause.JOIN;
      this.pos++;
      // Expect JOIN keyword next
      if (this.pos < this.tokens.length) {
        const next = this.tokens.filter(t => t.type !== TokenType.EOF && t.offset < this.cursorOffset);
        if (this.pos < next.length && isKeyword(next[this.pos], 'JOIN')) {
          this.pos++;
        }
      }
      this.state = ParserState.JOIN_TABLE;
      return;
    }

    if (isKeyword(token, 'JOIN')) {
      this.activeClause = ActiveClause.JOIN;
      this.state = ParserState.JOIN_TABLE;
      this.pos++;
      return;
    }

    this.handleClauseTransition(token);
  }

  private handleJoinTable(token: Token): void {
    this.activeClause = ActiveClause.JOIN;

    if (token.type === TokenType.IDENTIFIER) {
      this.tables.push(token.value);
      this.state = ParserState.JOIN_AFTER_TABLE;
      this.pos++;
      return;
    }

    this.diagnostics.push(`Expected table name for JOIN, got '${token.value}'`);
    this.pos++;
  }

  private handleJoinAfterTable(token: Token, tokens: Token[]): void {
    // Check for alias
    if (isKeyword(token, 'AS')) {
      this.pos++;
      if (this.pos < tokens.length && tokens[this.pos].type === TokenType.IDENTIFIER) {
        const aliasToken = tokens[this.pos];
        const tableName = this.tables[this.tables.length - 1];
        this.aliases.push({ alias: aliasToken.value, tableName });
        this.pos++;
      }
      this.state = ParserState.EXPECT_ON;
      return;
    }

    if (token.type === TokenType.IDENTIFIER && !isKeyword(token, 'ON') && !this.isClauseKeyword(token)) {
      const tableName = this.tables[this.tables.length - 1];
      this.aliases.push({ alias: token.value, tableName });
      this.pos++;
      this.state = ParserState.EXPECT_ON;
      return;
    }

    this.state = ParserState.EXPECT_ON;
    if (isKeyword(token, 'ON')) {
      this.handleExpectOn(token);
    } else {
      this.handleClauseTransition(token);
    }
  }

  private handleExpectOn(token: Token): void {
    if (isKeyword(token, 'ON')) {
      this.activeClause = ActiveClause.ON;
      this.state = ParserState.JOIN_CONDITION;
      this.pos++;
      return;
    }

    // ON is missing — transition to next state
    this.state = ParserState.EXPECT_JOIN_OR_CLAUSE;
    this.handleExpectJoinOrClause(token);
  }

  private handleConditionStart(token: Token, tokens: Token[], clauseType: 'WHERE' | 'HAVING'): void {
    this.activeClause = clauseType === 'WHERE' ? ActiveClause.WHERE : ActiveClause.HAVING;

    if (isKeyword(token, 'NOT')) {
      this.pos++;
      return;
    }

    if (token.type === TokenType.LPAREN) {
      this.pos++;
      return;
    }

    if (token.type === TokenType.IDENTIFIER) {
      // Check for qualified reference
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          this.pos += 3;
          this.state = clauseType === 'WHERE' ? ParserState.WHERE_OPERATOR : ParserState.HAVING_CONDITION;
          return;
        } else {
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2;
          return;
        }
      }
      this.pos++;
      this.state = clauseType === 'WHERE' ? ParserState.WHERE_OPERATOR : ParserState.HAVING_CONDITION;
      return;
    }

    if (this.isLiteral(token)) {
      this.pos++;
      this.state = clauseType === 'WHERE' ? ParserState.WHERE_OPERATOR : ParserState.HAVING_CONDITION;
      return;
    }

    this.pos++;
  }

  private handleConditionTokens(token: Token, tokens: Token[], nextState: ParserState): void {
    // Generic condition token walker for ON conditions
    if (token.type === TokenType.IDENTIFIER) {
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          this.pos += 3;
          return;
        } else {
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2;
          return;
        }
      }
      this.pos++;
      return;
    }

    if (token.type === TokenType.OPERATOR || isKeyword(token, 'LIKE')) {
      this.pos++;
      return;
    }

    if (isAnyKeyword(token, ['AND', 'OR', 'NOT', 'IS', 'NULL'])) {
      this.pos++;
      return;
    }

    if (this.isLiteral(token) || token.type === TokenType.LPAREN || token.type === TokenType.RPAREN) {
      this.pos++;
      return;
    }

    // Transition out of condition
    this.state = nextState;
    this.handleClauseTransition(token);
  }

  private handleWhereOperator(token: Token): void {
    this.activeClause = ActiveClause.WHERE;

    if (token.type === TokenType.OPERATOR || isKeyword(token, 'LIKE')) {
      this.state = ParserState.WHERE_RIGHT_OPERAND;
      this.pos++;
      return;
    }

    if (isKeyword(token, 'IS')) {
      this.pos++;
      // Handle IS [NOT] NULL
      this.state = ParserState.WHERE_BOOLEAN_OPERATOR;
      return;
    }

    if (isAnyKeyword(token, ['AND', 'OR'])) {
      this.state = ParserState.WHERE_OPERAND;
      this.pos++;
      return;
    }

    // Transition to next clause
    this.handleClauseTransition(token);
  }

  private handleWhereRightOperand(token: Token, tokens: Token[]): void {
    this.activeClause = ActiveClause.WHERE;

    if (token.type === TokenType.IDENTIFIER) {
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          this.pos += 3;
        } else {
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2;
          return;
        }
      } else {
        this.pos++;
      }
      this.state = ParserState.WHERE_BOOLEAN_OPERATOR;
      return;
    }

    if (this.isLiteral(token)) {
      this.pos++;
      this.state = ParserState.WHERE_BOOLEAN_OPERATOR;
      return;
    }

    if (isKeyword(token, 'NOT')) {
      this.pos++;
      return;
    }

    this.pos++;
    this.state = ParserState.WHERE_BOOLEAN_OPERATOR;
  }

  private handleWhereBooleanOperator(token: Token): void {
    this.activeClause = ActiveClause.WHERE;

    if (isKeyword(token, 'NOT')) {
      this.pos++;
      return;
    }

    if (isKeyword(token, 'NULL')) {
      this.pos++;
      return;
    }

    if (isAnyKeyword(token, ['AND', 'OR'])) {
      this.state = ParserState.WHERE_OPERAND;
      this.pos++;
      return;
    }

    if (token.type === TokenType.RPAREN) {
      this.pos++;
      return;
    }

    this.handleClauseTransition(token);
  }

  private handleGroupByColumn(token: Token, tokens: Token[]): void {
    this.activeClause = ActiveClause.GROUP_BY;

    if (token.type === TokenType.IDENTIFIER) {
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          this.pos += 3;
        } else {
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2;
          return;
        }
      } else {
        this.pos++;
      }
      this.state = ParserState.AFTER_GROUP_BY_COLUMN;
      return;
    }

    this.pos++;
  }

  private handleAfterGroupByColumn(token: Token): void {
    if (token.type === TokenType.COMMA) {
      this.state = ParserState.GROUP_BY_COLUMN;
      this.pos++;
      return;
    }

    this.handleClauseTransition(token);
  }

  private handleOrderByColumn(token: Token, tokens: Token[]): void {
    this.activeClause = ActiveClause.ORDER_BY;

    if (token.type === TokenType.IDENTIFIER) {
      if (this.pos + 1 < tokens.length && tokens[this.pos + 1].type === TokenType.DOT) {
        if (this.pos + 2 < tokens.length && tokens[this.pos + 2].type === TokenType.IDENTIFIER) {
          this.pos += 3;
        } else {
          this.state = ParserState.DOT_ACCESS;
          this.pos += 2;
          return;
        }
      } else {
        this.pos++;
      }
      this.state = ParserState.ORDER_DIRECTION;
      return;
    }

    this.pos++;
  }

  private handleOrderDirection(token: Token): void {
    this.activeClause = ActiveClause.ORDER_BY;

    if (isAnyKeyword(token, ['ASC', 'DESC'])) {
      this.pos++;
      // After direction, check for comma or next clause
      return;
    }

    if (token.type === TokenType.COMMA) {
      this.state = ParserState.ORDER_BY_COLUMN;
      this.pos++;
      return;
    }

    this.handleClauseTransition(token);
  }

  private handleLimitValue(token: Token): void {
    this.activeClause = ActiveClause.LIMIT;

    if (token.type === TokenType.INTEGER) {
      this.pos++;
      this.state = ParserState.QUERY_COMPLETE;
      return;
    }

    this.diagnostics.push(`Expected integer for LIMIT, got '${token.value}'`);
    this.pos++;
  }

  private handleDotAccess(token: Token): void {
    // After a dot, if we see an identifier, consume it
    if (token.type === TokenType.IDENTIFIER) {
      this.pos++;
      // Return to the clause-appropriate state
      switch (this.activeClause) {
        case ActiveClause.SELECT:
          this.state = ParserState.AFTER_SELECT_ITEM;
          break;
        case ActiveClause.WHERE:
          this.state = ParserState.WHERE_OPERATOR;
          break;
        case ActiveClause.ON:
          this.state = ParserState.JOIN_CONDITION;
          break;
        case ActiveClause.GROUP_BY:
          this.state = ParserState.AFTER_GROUP_BY_COLUMN;
          break;
        case ActiveClause.ORDER_BY:
          this.state = ParserState.ORDER_DIRECTION;
          break;
        case ActiveClause.HAVING:
          this.state = ParserState.HAVING_CONDITION;
          break;
        default:
          this.state = ParserState.UNKNOWN_RECOVERY;
          break;
      }
      return;
    }

    // If not an identifier, this is a keyword/clause transition
    // e.g., "SELECT s.\nFROM" — the FROM keyword after DOT_ACCESS
    if (this.isClauseKeyword(token)) {
      // Return to appropriate state and handle the clause
      this.handleClauseTransition(token);
      return;
    }
    this.pos++;
  }

  // ─── Clause Transition ───────────────────────────────────────

  private handleClauseTransition(token: Token): void {
    if (isKeyword(token, 'WHERE')) {
      this.state = ParserState.WHERE_START;
      this.activeClause = ActiveClause.WHERE;
      this.pos++;
      return;
    }

    if (isKeyword(token, 'GROUP')) {
      this.pos++;
      // Look for BY
      const relevantTokens = this.tokens.filter(t => t.type !== TokenType.EOF && t.offset < this.cursorOffset);
      if (this.pos < relevantTokens.length && isKeyword(relevantTokens[this.pos], 'BY')) {
        this.pos++;
      }
      this.state = ParserState.GROUP_BY_START;
      this.activeClause = ActiveClause.GROUP_BY;
      return;
    }

    if (isKeyword(token, 'HAVING')) {
      this.state = ParserState.HAVING_START;
      this.activeClause = ActiveClause.HAVING;
      this.pos++;
      return;
    }

    if (isKeyword(token, 'ORDER')) {
      this.pos++;
      const relevantTokens = this.tokens.filter(t => t.type !== TokenType.EOF && t.offset < this.cursorOffset);
      if (this.pos < relevantTokens.length && isKeyword(relevantTokens[this.pos], 'BY')) {
        this.pos++;
      }
      this.state = ParserState.ORDER_BY_START;
      this.activeClause = ActiveClause.ORDER_BY;
      return;
    }

    if (isKeyword(token, 'LIMIT')) {
      this.state = ParserState.LIMIT_START;
      this.activeClause = ActiveClause.LIMIT;
      this.pos++;
      return;
    }

    if (isAnyKeyword(token, ['INNER', 'LEFT', 'RIGHT'])) {
      this.activeClause = ActiveClause.JOIN;
      this.pos++;
      const relevantTokens = this.tokens.filter(t => t.type !== TokenType.EOF && t.offset < this.cursorOffset);
      if (this.pos < relevantTokens.length && isKeyword(relevantTokens[this.pos], 'JOIN')) {
        this.pos++;
      }
      this.state = ParserState.JOIN_TABLE;
      return;
    }

    if (isKeyword(token, 'JOIN')) {
      this.activeClause = ActiveClause.JOIN;
      this.state = ParserState.JOIN_TABLE;
      this.pos++;
      return;
    }

    if (isKeyword(token, 'FROM')) {
      this.state = ParserState.FROM_TABLE;
      this.activeClause = ActiveClause.FROM;
      this.pos++;
      return;
    }

    if (token.type === TokenType.SEMICOLON || token.type === TokenType.EOF) {
      this.state = ParserState.QUERY_COMPLETE;
      this.pos++;
      return;
    }

    // Unknown token — skip and recover
    this.pos++;
  }

  // ─── Expected Tokens ─────────────────────────────────────────

  private getExpected(): { expectedKinds: string[]; expectedKeywords: string[] } {
    switch (this.state) {
      case ParserState.START:
        return { expectedKinds: ['KEYWORD'], expectedKeywords: ['SELECT'] };

      case ParserState.AFTER_SELECT:
      case ParserState.SELECT_LIST:
        return {
          expectedKinds: ['IDENTIFIER', 'STAR', 'KEYWORD'],
          expectedKeywords: ['DISTINCT', 'NULL', 'TRUE', 'FALSE'],
        };

      case ParserState.AFTER_SELECT_ITEM:
        return {
          expectedKinds: ['COMMA', 'KEYWORD'],
          expectedKeywords: ['FROM', 'AS'],
        };

      case ParserState.EXPECT_FROM:
        return { expectedKinds: ['KEYWORD'], expectedKeywords: ['FROM'] };

      case ParserState.FROM_TABLE:
        return { expectedKinds: ['IDENTIFIER'], expectedKeywords: [] };

      case ParserState.AFTER_FROM_TABLE:
        return {
          expectedKinds: ['IDENTIFIER', 'KEYWORD'],
          expectedKeywords: ['AS', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'WHERE', 'GROUP', 'ORDER', 'LIMIT'],
        };

      case ParserState.EXPECT_JOIN_OR_CLAUSE:
        return {
          expectedKinds: ['KEYWORD'],
          expectedKeywords: ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'],
        };

      case ParserState.JOIN_TABLE:
        return { expectedKinds: ['IDENTIFIER'], expectedKeywords: [] };

      case ParserState.JOIN_AFTER_TABLE:
        return {
          expectedKinds: ['IDENTIFIER', 'KEYWORD'],
          expectedKeywords: ['AS', 'ON'],
        };

      case ParserState.EXPECT_ON:
        return { expectedKinds: ['KEYWORD'], expectedKeywords: ['ON'] };

      case ParserState.JOIN_CONDITION:
        return {
          expectedKinds: ['IDENTIFIER', 'OPERATOR', 'KEYWORD'],
          expectedKeywords: ['AND', 'OR', 'NOT', 'IS', 'NULL', 'LIKE'],
        };

      case ParserState.WHERE_START:
      case ParserState.WHERE_OPERAND:
        return {
          expectedKinds: ['IDENTIFIER', 'INTEGER', 'DECIMAL', 'STRING', 'KEYWORD', 'LPAREN'],
          expectedKeywords: ['NOT', 'NULL', 'TRUE', 'FALSE'],
        };

      case ParserState.WHERE_OPERATOR:
        return {
          expectedKinds: ['OPERATOR', 'KEYWORD'],
          expectedKeywords: ['IS', 'LIKE', 'AND', 'OR', 'NOT'],
        };

      case ParserState.WHERE_RIGHT_OPERAND:
        return {
          expectedKinds: ['IDENTIFIER', 'INTEGER', 'DECIMAL', 'STRING', 'KEYWORD'],
          expectedKeywords: ['NULL', 'TRUE', 'FALSE', 'NOT'],
        };

      case ParserState.WHERE_BOOLEAN_OPERATOR:
        return {
          expectedKinds: ['KEYWORD'],
          expectedKeywords: ['AND', 'OR', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'],
        };

      case ParserState.GROUP_BY_START:
      case ParserState.GROUP_BY_COLUMN:
        return {
          expectedKinds: ['IDENTIFIER'],
          expectedKeywords: [],
        };

      case ParserState.AFTER_GROUP_BY_COLUMN:
        return {
          expectedKinds: ['COMMA', 'KEYWORD'],
          expectedKeywords: ['HAVING', 'ORDER', 'LIMIT'],
        };

      case ParserState.HAVING_START:
      case ParserState.HAVING_CONDITION:
        return {
          expectedKinds: ['IDENTIFIER', 'INTEGER', 'DECIMAL', 'STRING', 'KEYWORD', 'OPERATOR'],
          expectedKeywords: ['NOT', 'NULL', 'TRUE', 'FALSE', 'AND', 'OR', 'IS', 'LIKE'],
        };

      case ParserState.ORDER_BY_START:
      case ParserState.ORDER_BY_COLUMN:
        return {
          expectedKinds: ['IDENTIFIER'],
          expectedKeywords: [],
        };

      case ParserState.ORDER_DIRECTION:
        return {
          expectedKinds: ['KEYWORD', 'COMMA'],
          expectedKeywords: ['ASC', 'DESC', 'LIMIT'],
        };

      case ParserState.LIMIT_START:
      case ParserState.LIMIT_VALUE:
        return {
          expectedKinds: ['INTEGER'],
          expectedKeywords: [],
        };

      case ParserState.DOT_ACCESS:
        return {
          expectedKinds: ['IDENTIFIER'],
          expectedKeywords: [],
        };

      case ParserState.QUERY_COMPLETE:
        return { expectedKinds: [], expectedKeywords: [] };

      default:
        return { expectedKinds: ['IDENTIFIER', 'KEYWORD'], expectedKeywords: [] };
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private isClauseKeyword(token: Token): boolean {
    return isAnyKeyword(token, [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
      'ON', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'AND', 'OR', 'NOT',
      'IS', 'NULL', 'LIKE', 'ASC', 'DESC', 'BY', 'AS',
      'TRUE', 'FALSE', 'DISTINCT',
    ]);
  }

  private isLiteral(token: Token): boolean {
    return token.type === TokenType.INTEGER ||
           token.type === TokenType.DECIMAL ||
           token.type === TokenType.STRING ||
           isAnyKeyword(token, ['NULL', 'TRUE', 'FALSE']);
  }

  private tryConsumeAlias(tokens: Token[]): void {
    if (this.pos >= tokens.length) return;
    const token = tokens[this.pos];

    if (isKeyword(token, 'AS')) {
      this.pos++;
      if (this.pos < tokens.length && tokens[this.pos].type === TokenType.IDENTIFIER) {
        this.pos++;
      }
      return;
    }
  }

  // ─── Build Result ────────────────────────────────────────────

  private buildResult(
    state: ParserState,
    expectedKinds: string[],
    expectedKeywords: string[]
  ): CompletionContextResult {
    // Determine the current prefix and dot qualifier
    let currentPrefix = '';
    let dotQualifier: string | null = null;

    const relevantTokens = this.tokens.filter(
      t => t.type !== TokenType.EOF && t.offset < this.cursorOffset
    );

    if (relevantTokens.length > 0) {
      const lastToken = relevantTokens[relevantTokens.length - 1];
      const tokenEnd = lastToken.offset + lastToken.length;

      if (lastToken.type === TokenType.DOT && relevantTokens.length >= 2) {
        // Cursor is right after a dot: "s.|"
        const beforeDot = relevantTokens[relevantTokens.length - 2];
        if (beforeDot.type === TokenType.IDENTIFIER) {
          dotQualifier = beforeDot.value;
          currentPrefix = '';
          // Override state to DOT_ACCESS
          state = ParserState.DOT_ACCESS;
        }
      } else if (
        tokenEnd === this.cursorOffset &&
        lastToken.type === TokenType.IDENTIFIER
      ) {
        // Cursor is right at end of an identifier
        if (relevantTokens.length >= 2) {
          const prevToken = relevantTokens[relevantTokens.length - 2];
          if (prevToken.type === TokenType.DOT && relevantTokens.length >= 3) {
            const beforeDot = relevantTokens[relevantTokens.length - 3];
            if (beforeDot.type === TokenType.IDENTIFIER) {
              dotQualifier = beforeDot.value;
              currentPrefix = lastToken.value;
            }
          } else {
            currentPrefix = lastToken.value;
          }
        } else {
          currentPrefix = lastToken.value;
        }
      } else if (tokenEnd < this.cursorOffset) {
        // Cursor is after the last token with whitespace
        currentPrefix = '';
      }
    }

    return {
      parserState: state,
      expectedTokenKinds: expectedKinds,
      expectedKeywords: expectedKeywords,
      activeClause: this.activeClause,
      activeAliases: [...this.aliases],
      activeTables: [...this.tables],
      currentPrefix,
      dotQualifier,
      tokenIndex: this.pos,
      diagnostics: [...this.diagnostics],
    };
  }
}

// ─── Convenience ───────────────────────────────────────────────────

export function analyzePrefixSQL(sql: string, cursorOffset?: number): CompletionContextResult {
  const offset = cursorOffset ?? sql.length;
  const { tokens } = tokenize(sql);
  const parser = new PrefixParser(tokens, offset);
  return parser.analyze();
}
