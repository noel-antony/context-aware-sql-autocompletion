/**
 * Semantic Analyzer
 *
 * Walks the AST to perform name resolution and type checking.
 * Validates table/alias/column references against the symbol table,
 * checks type compatibility in expressions, and produces diagnostics.
 *
 * Operates separately from the parser (syntax analysis ≠ semantic analysis).
 */

import {
  QueryNode,
  ExpressionNode,
  ColumnReferenceNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IsNullExpressionNode,
  LiteralNode,
  SelectItemNode,
  JoinClauseNode,
  ParenExpressionNode,
} from '../ast/nodes';
import { SymbolTable } from './symbolTable';
import { ColumnType } from '../../schema/schemaTypes';
import { SchemaCatalog } from '../../schema/schemaCatalog';
import {
  areTypesCompatible,
  isValidBooleanOperand,
  isValidLikeOperand,
  literalTypeToColumnType,
  isNumericType,
} from './types';
import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticCode,
  DiagnosticSeverity,
} from '../diagnostics/diagnostics';

// ─── Semantic Analysis Result ─────────────────────────────────────

export interface SemanticAnalysisResult {
  diagnostics: Diagnostic[];
  symbolTable: SymbolTable;
}

// ─── Semantic Analyzer ────────────────────────────────────────────

export class SemanticAnalyzer {
  private symbolTable: SymbolTable;
  private diagnostics: DiagnosticCollection;
  private catalog: SchemaCatalog;
  private groupByColumns: Set<string> = new Set();
  private hasGroupBy: boolean = false;

  constructor(catalog: SchemaCatalog) {
    this.catalog = catalog;
    this.symbolTable = new SymbolTable(catalog);
    this.diagnostics = new DiagnosticCollection();
  }

  analyze(ast: QueryNode): SemanticAnalysisResult {
    this.symbolTable.clear();
    this.diagnostics.clear();
    this.groupByColumns.clear();
    this.hasGroupBy = false;

    // Phase 1: Register tables and aliases from FROM/JOIN
    this.registerFromClause(ast);

    // Phase 2: Analyze GROUP BY first (affects SELECT validation)
    if (ast.groupBy) {
      this.hasGroupBy = true;
      this.analyzeGroupBy(ast);
    }

    // Phase 3: Analyze SELECT list
    this.analyzeSelect(ast);

    // Phase 4: Analyze WHERE
    if (ast.where) {
      this.analyzeCondition(ast.where.condition, 'WHERE');
    }

    // Phase 5: Analyze JOIN conditions
    if (ast.from) {
      for (const join of ast.from.joins) {
        if (join.condition) {
          this.analyzeCondition(join.condition, 'ON');
        }
      }
    }

    // Phase 6: Analyze HAVING
    if (ast.having) {
      this.analyzeCondition(ast.having.condition, 'HAVING');
    }

    // Phase 7: Analyze ORDER BY
    if (ast.orderBy) {
      this.analyzeOrderBy(ast);
    }

    // Phase 8: Analyze LIMIT
    if (ast.limit) {
      this.analyzeLimitClause(ast);
    }

    return {
      diagnostics: this.diagnostics.getAll(),
      symbolTable: this.symbolTable,
    };
  }

  // ─── Table Registration ──────────────────────────────────────

  private registerFromClause(ast: QueryNode): void {
    if (!ast.from) return;

    const fromTable = ast.from.table;
    const result = this.symbolTable.registerTable(fromTable.tableName, fromTable.alias);
    if (!result.success && result.error) {
      this.diagnostics.error(
        result.error,
        result.error.includes('Duplicate') ? DiagnosticCode.DUPLICATE_ALIAS : DiagnosticCode.UNKNOWN_TABLE,
        fromTable.location,
        result.error.includes('Unknown') ? `Check that '${fromTable.tableName}' exists in the schema` : undefined
      );
    }

    for (const join of ast.from.joins) {
      const joinResult = this.symbolTable.registerTable(join.table.tableName, join.table.alias);
      if (!joinResult.success && joinResult.error) {
        this.diagnostics.error(
          joinResult.error,
          joinResult.error.includes('Duplicate') ? DiagnosticCode.DUPLICATE_ALIAS : DiagnosticCode.UNKNOWN_TABLE,
          join.table.location,
        );
      }
    }
  }

  // ─── SELECT Analysis ─────────────────────────────────────────

  private analyzeSelect(ast: QueryNode): void {
    for (const item of ast.select.items) {
      if (item.expression === '*') continue;
      this.resolveExpressionType(item.expression);
    }
  }

  // ─── GROUP BY Analysis ───────────────────────────────────────

  private analyzeGroupBy(ast: QueryNode): void {
    if (!ast.groupBy) return;

    for (const col of ast.groupBy.columns) {
      const key = col.table ? `${col.table}.${col.column}` : col.column;
      this.groupByColumns.add(key.toLowerCase());
      this.resolveColumnReference(col);
    }
  }

  // ─── ORDER BY Analysis ──────────────────────────────────────

  private analyzeOrderBy(ast: QueryNode): void {
    if (!ast.orderBy) return;

    for (const item of ast.orderBy.items) {
      this.resolveColumnReference(item.column);
    }
  }

  // ─── LIMIT Analysis ─────────────────────────────────────────

  private analyzeLimitClause(ast: QueryNode): void {
    if (!ast.limit) return;

    const limitType = this.resolveExpressionType(ast.limit.count);
    if (limitType !== ColumnType.INT && limitType !== ColumnType.UNKNOWN && limitType !== ColumnType.NULL) {
      this.diagnostics.error(
        `LIMIT requires an integer value, got ${limitType}`,
        DiagnosticCode.INVALID_LIMIT_TYPE,
        ast.limit.location,
      );
    }
  }

  // ─── Condition Analysis ──────────────────────────────────────

  private analyzeCondition(expr: ExpressionNode, context: string): void {
    const resultType = this.resolveExpressionType(expr);

    // The overall condition should produce a boolean-compatible result
    // For binary comparisons this is automatically true
    // For column references used directly as conditions, check
    if (expr.type === 'ColumnReference' || expr.type === 'Literal') {
      if (resultType !== ColumnType.BOOLEAN && resultType !== ColumnType.UNKNOWN && resultType !== ColumnType.NULL) {
        this.diagnostics.warning(
          `${context} condition should be a boolean expression, got ${resultType}`,
          DiagnosticCode.INVALID_BOOLEAN_EXPRESSION,
          expr.location,
        );
      }
    }
  }

  // ─── Expression Type Resolution ──────────────────────────────

  resolveExpressionType(expr: ExpressionNode): ColumnType {
    switch (expr.type) {
      case 'ColumnReference':
        return this.resolveColumnReference(expr);

      case 'Literal':
        return this.resolveLiteralType(expr);

      case 'BinaryExpression':
        return this.resolveBinaryExpressionType(expr);

      case 'UnaryExpression':
        return this.resolveUnaryExpressionType(expr);

      case 'IsNullExpression':
        return this.resolveIsNullType(expr);

      case 'ParenExpression':
        return this.resolveExpressionType(expr.expression);

      default:
        return ColumnType.UNKNOWN;
    }
  }

  private resolveColumnReference(ref: ColumnReferenceNode): ColumnType {
    const resolution = this.symbolTable.resolveColumn(ref.table, ref.column);

    if (!resolution.resolved) {
      if (resolution.ambiguous) {
        this.diagnostics.error(
          resolution.error!,
          DiagnosticCode.AMBIGUOUS_COLUMN,
          ref.location,
          `Qualify the column with a table alias (e.g., ${resolution.candidates?.map(c => `${c.qualifier}.${c.columnName}`).join(' or ')})`,
        );
      } else if (ref.table) {
        // Check whether it's the alias or the column that's wrong
        const tableSymbol = this.symbolTable.lookupTable(ref.table);
        if (!tableSymbol) {
          this.diagnostics.error(
            resolution.error!,
            DiagnosticCode.UNKNOWN_ALIAS,
            ref.location,
          );
        } else {
          this.diagnostics.error(
            resolution.error!,
            DiagnosticCode.UNKNOWN_COLUMN,
            ref.location,
          );
        }
      } else {
        this.diagnostics.error(
          resolution.error!,
          DiagnosticCode.UNKNOWN_COLUMN,
          ref.location,
        );
      }
      return ColumnType.UNKNOWN;
    }

    return resolution.column!.columnType;
  }

  private resolveLiteralType(lit: LiteralNode): ColumnType {
    return literalTypeToColumnType(lit.literalType);
  }

  private resolveBinaryExpressionType(expr: BinaryExpressionNode): ColumnType {
    const leftType = this.resolveExpressionType(expr.left);
    const rightType = this.resolveExpressionType(expr.right);

    const op = expr.operator;

    // Boolean operators: AND, OR
    if (op === 'AND' || op === 'OR') {
      if (!isValidBooleanOperand(leftType)) {
        this.diagnostics.error(
          `Left operand of ${op} must be boolean, got ${leftType}`,
          DiagnosticCode.INVALID_BOOLEAN_EXPRESSION,
          expr.left.location,
        );
      }
      if (!isValidBooleanOperand(rightType)) {
        this.diagnostics.error(
          `Right operand of ${op} must be boolean, got ${rightType}`,
          DiagnosticCode.INVALID_BOOLEAN_EXPRESSION,
          expr.right.location,
        );
      }
      return ColumnType.BOOLEAN;
    }

    // LIKE operator
    if (op === 'LIKE') {
      if (!isValidLikeOperand(leftType)) {
        this.diagnostics.error(
          `Left operand of LIKE must be text, got ${leftType}`,
          DiagnosticCode.INVALID_LIKE_TYPE,
          expr.left.location,
        );
      }
      if (!isValidLikeOperand(rightType)) {
        this.diagnostics.error(
          `Right operand of LIKE must be text, got ${rightType}`,
          DiagnosticCode.INVALID_LIKE_TYPE,
          expr.right.location,
        );
      }
      return ColumnType.BOOLEAN;
    }

    // Comparison operators: =, !=, <>, <, <=, >, >=
    if (!areTypesCompatible(leftType, rightType)) {
      this.diagnostics.error(
        `Type mismatch: cannot compare ${leftType} with ${rightType}`,
        DiagnosticCode.TYPE_MISMATCH,
        expr.location,
        `Left operand is ${leftType}, right operand is ${rightType}`,
      );
    }

    return ColumnType.BOOLEAN;
  }

  private resolveUnaryExpressionType(expr: UnaryExpressionNode): ColumnType {
    const operandType = this.resolveExpressionType(expr.operand);

    if (expr.operator === 'NOT') {
      if (!isValidBooleanOperand(operandType)) {
        this.diagnostics.error(
          `NOT operand must be boolean, got ${operandType}`,
          DiagnosticCode.INVALID_BOOLEAN_EXPRESSION,
          expr.operand.location,
        );
      }
      return ColumnType.BOOLEAN;
    }

    return ColumnType.UNKNOWN;
  }

  private resolveIsNullType(expr: IsNullExpressionNode): ColumnType {
    // IS NULL / IS NOT NULL works on any type
    this.resolveExpressionType(expr.operand);
    return ColumnType.BOOLEAN;
  }
}

// ─── Convenience ───────────────────────────────────────────────────

export function analyzeSemantics(ast: QueryNode, catalog: SchemaCatalog): SemanticAnalysisResult {
  const analyzer = new SemanticAnalyzer(catalog);
  return analyzer.analyze(ast);
}
