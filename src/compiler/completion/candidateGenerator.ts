/**
 * Completion Candidate Generator
 *
 * Generates completion candidates from two sources:
 * Source A: Grammar/parser state → keyword, clause, operator, direction candidates
 * Source B: Schema/symbol table → table, column, alias candidates
 *
 * Candidates are filtered by the completion context expectations
 * so that only syntactically and semantically meaningful candidates
 * are produced.
 */

import { CompletionCandidate, CandidateKind } from './candidateTypes';
import { CompletionExpectation, buildCompletionExpectation } from './completionContext';
import { CompletionContextResult } from '../parser/parserState';
import { SymbolTable, ColumnSymbol } from '../semantic/symbolTable';
import { SchemaCatalog } from '../../schema/schemaCatalog';
import { ColumnType } from '../../schema/schemaTypes';

// ─── Candidate Generator ──────────────────────────────────────────

export class CandidateGenerator {
  private catalog: SchemaCatalog;
  private symbolTable: SymbolTable;

  constructor(catalog: SchemaCatalog, symbolTable: SymbolTable) {
    this.catalog = catalog;
    this.symbolTable = symbolTable;
  }

  /**
   * Generate all completion candidates for the given context.
   */
  generate(context: CompletionContextResult): CompletionCandidate[] {
    const expectation = buildCompletionExpectation(context);
    const candidates: CompletionCandidate[] = [];

    // Source A: Grammar/parser state candidates
    if (expectation.expectKeywords) {
      candidates.push(...this.generateKeywordCandidates(expectation));
    }

    if (expectation.expectOperators) {
      candidates.push(...this.generateOperatorCandidates());
    }

    if (expectation.expectDirection) {
      candidates.push(...this.generateDirectionCandidates());
    }

    if (expectation.expectStar) {
      candidates.push(this.generateStarCandidate());
    }

    // Source B: Schema/symbol table candidates
    if (expectation.expectTables) {
      candidates.push(...this.generateTableCandidates());
    }

    if (expectation.expectColumns) {
      if (expectation.qualifierFilter) {
        candidates.push(...this.generateQualifiedColumnCandidates(expectation.qualifierFilter));
      } else {
        candidates.push(...this.generateColumnCandidates(context));
      }
    }

    if (expectation.expectAliases && !expectation.qualifierFilter) {
      candidates.push(...this.generateAliasCandidates(context));
    }

    return candidates;
  }

  // ─── Grammar Candidates (Source A) ───────────────────────────

  private generateKeywordCandidates(expectation: CompletionExpectation): CompletionCandidate[] {
    return expectation.keywords.map(keyword => ({
      label: keyword,
      insertText: keyword.includes(' ') ? keyword : keyword + ' ',
      kind: this.classifyKeyword(keyword),
      detail: 'SQL keyword',
      source: 'grammar' as const,
      syntaxScore: 1.0,
      semanticScore: 0.75,
      typeScore: 0.5,
      contextScore: 0.8,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    }));
  }

  private generateOperatorCandidates(): CompletionCandidate[] {
    const operators = ['=', '!=', '<>', '<', '<=', '>', '>='];
    return operators.map(op => ({
      label: op,
      insertText: op + ' ',
      kind: CandidateKind.OPERATOR,
      detail: 'Comparison operator',
      source: 'grammar' as const,
      syntaxScore: 1.0,
      semanticScore: 0.75,
      typeScore: 0.5,
      contextScore: 0.8,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    }));
  }

  private generateDirectionCandidates(): CompletionCandidate[] {
    return [
      {
        label: 'ASC',
        insertText: 'ASC ',
        kind: CandidateKind.DIRECTION,
        detail: 'Ascending order',
        source: 'grammar' as const,
        syntaxScore: 1.0,
        semanticScore: 0.75,
        typeScore: 0.5,
        contextScore: 1.0,
        prefixScore: 0,
        finalScore: 0,
        explanation: '',
      },
      {
        label: 'DESC',
        insertText: 'DESC ',
        kind: CandidateKind.DIRECTION,
        detail: 'Descending order',
        source: 'grammar' as const,
        syntaxScore: 1.0,
        semanticScore: 0.75,
        typeScore: 0.5,
        contextScore: 1.0,
        prefixScore: 0,
        finalScore: 0,
        explanation: '',
      },
    ];
  }

  private generateStarCandidate(): CompletionCandidate {
    return {
      label: '*',
      insertText: '* ',
      kind: CandidateKind.STAR,
      detail: 'All columns',
      source: 'grammar' as const,
      syntaxScore: 1.0,
      semanticScore: 0.75,
      typeScore: 0.5,
      contextScore: 0.9,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    };
  }

  // ─── Schema Candidates (Source B) ────────────────────────────

  private generateTableCandidates(): CompletionCandidate[] {
    return this.catalog.getTables().map(table => ({
      label: table.name,
      insertText: table.name + ' ',
      kind: CandidateKind.TABLE,
      detail: `Table (${table.columns.length} columns)`,
      source: 'schema' as const,
      syntaxScore: 1.0,
      semanticScore: 1.0,
      typeScore: 0.5,
      contextScore: 1.0,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    }));
  }

  private generateColumnCandidates(context: CompletionContextResult): CompletionCandidate[] {
    const candidates: CompletionCandidate[] = [];
    const allColumns = this.symbolTable.getAllVisibleColumns();

    // If there are active aliases/tables in the query, use them
    if (allColumns.length > 0) {
      for (const col of allColumns) {
        const qualifiedLabel = `${col.qualifier}.${col.columnName}`;
        candidates.push({
          label: qualifiedLabel,
          insertText: qualifiedLabel,
          kind: CandidateKind.COLUMN,
          detail: `${col.columnType} (${col.tableName})`,
          source: 'schema' as const,
          syntaxScore: 1.0,
          semanticScore: 1.0,
          typeScore: 0.5,
          contextScore: 0.9,
          prefixScore: 0,
          finalScore: 0,
          explanation: '',
        });
      }

      // Also add unqualified versions for convenience
      const seenColumns = new Set<string>();
      for (const col of allColumns) {
        if (!seenColumns.has(col.columnName.toLowerCase())) {
          seenColumns.add(col.columnName.toLowerCase());
          // Check if unqualified would be ambiguous
          const resolution = this.symbolTable.resolveUnqualifiedColumn(col.columnName);
          if (!resolution.ambiguous) {
            candidates.push({
              label: col.columnName,
              insertText: col.columnName,
              kind: CandidateKind.COLUMN,
              detail: `${col.columnType} (${col.tableName})`,
              source: 'schema' as const,
              syntaxScore: 0.75,
              semanticScore: resolution.resolved ? 1.0 : 0.5,
              typeScore: 0.5,
              contextScore: 0.7,
              prefixScore: 0,
              finalScore: 0,
              explanation: '',
            });
          }
        }
      }
    } else {
      // No tables registered yet — offer all table columns from schema
      for (const table of this.catalog.getTables()) {
        for (const col of table.columns) {
          candidates.push({
            label: col.name,
            insertText: col.name,
            kind: CandidateKind.COLUMN,
            detail: `${col.type} (${table.name})`,
            source: 'schema' as const,
            syntaxScore: 0.75,
            semanticScore: 0.5,
            typeScore: 0.5,
            contextScore: 0.5,
            prefixScore: 0,
            finalScore: 0,
            explanation: '',
          });
        }
      }
    }

    return candidates;
  }

  private generateQualifiedColumnCandidates(qualifier: string): CompletionCandidate[] {
    const columns = this.symbolTable.getColumnsForTable(qualifier);

    if (columns.length === 0) {
      // Try direct table lookup
      const tableDef = this.catalog.findTable(qualifier);
      if (tableDef) {
        return tableDef.columns.map(col => ({
          label: col.name,
          insertText: col.name,
          kind: CandidateKind.COLUMN,
          detail: `${col.type} (${tableDef.name})`,
          source: 'schema' as const,
          syntaxScore: 1.0,
          semanticScore: 0.75,
          typeScore: 0.5,
          contextScore: 0.8,
          prefixScore: 0,
          finalScore: 0,
          explanation: '',
        }));
      }
      return [];
    }

    return columns.map(col => ({
      label: col.columnName,
      insertText: col.columnName,
      kind: CandidateKind.COLUMN,
      detail: `${col.columnType} (${col.tableName})`,
      source: 'schema' as const,
      syntaxScore: 1.0,
      semanticScore: 1.0,
      typeScore: 0.5,
      contextScore: 1.0,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    }));
  }

  private generateAliasCandidates(context: CompletionContextResult): CompletionCandidate[] {
    const tableSymbols = this.symbolTable.getTableSymbols();
    return tableSymbols.map(ts => ({
      label: ts.referenceName,
      insertText: ts.referenceName,
      kind: ts.isAlias ? CandidateKind.ALIAS : CandidateKind.TABLE,
      detail: ts.isAlias ? `Alias for ${ts.tableName}` : `Table ${ts.tableName}`,
      source: 'symbol_table' as const,
      syntaxScore: 1.0,
      semanticScore: ts.tableDef ? 1.0 : 0.0,
      typeScore: 0.5,
      contextScore: 0.85,
      prefixScore: 0,
      finalScore: 0,
      explanation: '',
    }));
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private classifyKeyword(keyword: string): CandidateKind {
    const clauseKeywords = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'];
    if (clauseKeywords.includes(keyword)) return CandidateKind.CLAUSE;
    if (keyword === 'ASC' || keyword === 'DESC') return CandidateKind.DIRECTION;
    return CandidateKind.KEYWORD;
  }
}
