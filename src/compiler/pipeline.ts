/**
 * Compiler Pipeline — Main Entry Point
 *
 * Orchestrates the complete compilation pipeline:
 *   partial SQL → tokens → parser state → AST/context
 *   → semantic environment → candidates → ranking
 *
 * Provides a single function that the editor and UI consume.
 */

import { tokenize, LexerResult } from './lexer/lexer';
import { Token } from './lexer/token';
import { Parser, ParseResult } from './parser/parser';
import { analyzePrefixSQL } from './parser/prefixParser';
import { CompletionContextResult, AliasEntry } from './parser/parserState';
import { SymbolTable } from './semantic/symbolTable';
import { SemanticAnalyzer, SemanticAnalysisResult } from './semantic/semanticAnalyzer';
import { Diagnostic } from './diagnostics/diagnostics';
import { CandidateGenerator } from './completion/candidateGenerator';
import { RankingEngine } from './completion/ranking';
import { CompletionCandidate } from './completion/candidateTypes';
import { SchemaCatalog } from '../schema/schemaCatalog';
import { QueryNode } from './ast/nodes';
import { buildCompletionExpectation } from './completion/completionContext';
import { ColumnType } from '../schema/schemaTypes';

// ─── Pipeline Result ──────────────────────────────────────────────

export interface PipelineResult {
  /** Ranked completion candidates */
  candidates: CompletionCandidate[];

  /** Current prefix parser state/context */
  context: CompletionContextResult;

  /** Tokens from lexical analysis */
  tokens: Token[];

  /** Semantic diagnostics */
  diagnostics: Diagnostic[];

  /** Parsed AST (from full parser, may be null for incomplete queries) */
  ast: QueryNode | null;

  /** Parse errors */
  parseErrors: { message: string; line: number; column: number }[];

  /** Symbol table state */
  symbolTable: SymbolTable;

  /** Lexer diagnostics */
  lexerDiagnostics: { message: string; line: number; column: number }[];
}

// ─── Pipeline ─────────────────────────────────────────────────────

export function runPipeline(
  sql: string,
  cursorOffset: number,
  catalog: SchemaCatalog
): PipelineResult {
  // Phase 1: Lexical analysis
  const lexerResult = tokenize(sql);
  const tokens = lexerResult.tokens;
  const lexerDiagnostics = lexerResult.diagnostics.map(d => ({
    message: d.message,
    line: d.line,
    column: d.column,
  }));

  // Phase 2: Prefix parsing (tolerant — works on incomplete SQL)
  const context = analyzePrefixSQL(sql, cursorOffset);

  // Phase 2b: Also scan the FULL query for aliases/tables
  // This handles the common case where cursor is in SELECT but FROM/aliases are defined after
  const fullContext = analyzePrefixSQL(sql, sql.length);

  // Merge aliases from full context into the cursor context
  for (const alias of fullContext.activeAliases) {
    if (!context.activeAliases.some(a => a.alias === alias.alias)) {
      context.activeAliases.push(alias);
    }
  }
  for (const table of fullContext.activeTables) {
    if (!context.activeTables.includes(table)) {
      context.activeTables.push(table);
    }
  }

  // Phase 3: Build symbol table from merged alias/table info
  const symbolTable = new SymbolTable(catalog);
  registerContextTables(symbolTable, context, catalog);

  // Phase 4: Try full parse for AST and semantic analysis
  let ast: QueryNode | null = null;
  let parseErrors: { message: string; line: number; column: number }[] = [];
  let semanticDiagnostics: Diagnostic[] = [];

  try {
    const parser = new Parser(tokens);
    const parseResult = parser.parse();
    ast = parseResult.ast;
    parseErrors = parseResult.errors.map(e => ({
      message: e.message,
      line: e.line,
      column: e.column,
    }));

    // Phase 5: Semantic analysis (only if we got an AST)
    if (ast) {
      const semanticResult = new SemanticAnalyzer(catalog).analyze(ast);
      semanticDiagnostics = semanticResult.diagnostics;
    }
  } catch {
    // Full parse failed — that's OK for incomplete queries
  }

  // Phase 6: Generate candidates
  const generator = new CandidateGenerator(catalog, symbolTable);
  const rawCandidates = generator.generate(context);

  // Phase 7: Determine expected type for type-aware ranking
  const expectation = buildCompletionExpectation(context);
  const expectedType = expectation.expectedType;

  // Phase 8: Rank candidates
  const ranker = new RankingEngine();
  const candidates = ranker.rank(rawCandidates, context, expectedType);

  return {
    candidates,
    context,
    tokens,
    diagnostics: semanticDiagnostics,
    ast,
    parseErrors,
    symbolTable,
    lexerDiagnostics,
  };
}

// ─── Helper: Register tables/aliases from prefix parser context ───

function registerContextTables(
  symbolTable: SymbolTable,
  context: CompletionContextResult,
  catalog: SchemaCatalog
): void {
  const registeredNames = new Set<string>();

  // Register aliased tables
  for (const alias of context.activeAliases) {
    const key = alias.alias.toLowerCase();
    if (!registeredNames.has(key)) {
      symbolTable.registerTable(alias.tableName, alias.alias);
      registeredNames.add(key);
    }
  }

  // Register un-aliased tables
  for (const tableName of context.activeTables) {
    const key = tableName.toLowerCase();
    // Don't register if already registered via alias
    const alreadyAliased = context.activeAliases.some(
      a => a.tableName.toLowerCase() === key
    );
    if (!alreadyAliased && !registeredNames.has(key)) {
      symbolTable.registerTable(tableName);
      registeredNames.add(key);
    }
  }
}

// ─── Convenience: Get completion for Monaco ───────────────────────

export function getCompletions(
  sql: string,
  cursorOffset: number,
  catalog: SchemaCatalog
): PipelineResult {
  return runPipeline(sql, cursorOffset, catalog);
}
