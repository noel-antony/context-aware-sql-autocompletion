# Compiler Pipeline

This document explains the complete execution lifecycle in `src/compiler/pipeline.ts`.

Whenever the user changes the code in the editor, the `getCompletions(sql, cursorOffset, catalog)` function is invoked.

## Phase 1: Lexical Analysis
- Input: Raw SQL String
- Action: Character-by-character scan matching logic in `src/compiler/lexer/lexer.ts`.
- Output: `Token[]`
- Notes: Errors like unclosed strings are emitted as `UNKNOWN` tokens but do not crash the pipeline.

## Phase 2: Prefix Parsing
- Input: `Token[]` up to `cursorOffset`
- Action: State machine traversal (`src/compiler/parser/prefixParser.ts`).
- Output: `ParserState` (e.g., `DOT_ACCESS`), Active Clause, and extracted context variables (e.g., incomplete word prefixes).

## Phase 3: Global Alias Scan
- Action: A secondary prefix parse of the *entire* SQL string to extract tables/aliases that might be defined *after* the cursor (e.g. typing `SELECT s.` before writing `FROM Student s`).
- Output: Merged list of `ActiveAliases` and `ActiveTables`.

## Phase 4: Symbol Table Construction
- Action: Registers all known aliases and tables into `SymbolTable` to resolve scopes for completion.

## Phase 5: Syntax Parsing (AST)
- Action: Tries to parse the full string using a Recursive Descent parser (`src/compiler/parser/parser.ts`).
- Notes: If it fails (due to incomplete typing), it silently catches the error and moves on. The AST is optional for autocomplete, but required for deep semantics.

## Phase 6: Semantic Analysis
- Action: If an AST is produced, `SemanticAnalyzer` traverses it.
- Validation: Checks if tables exist, variables are defined, columns are ambiguous, and expressions (e.g. `WHERE x = y`) are type-compatible.
- Output: List of `Diagnostic` elements shown as squiggly red/yellow lines in the editor.

## Phase 7: Candidate Generation
- Action: `CandidateGenerator` looks at `ParserState`. If grammar keywords are expected, it emits them. If columns are expected (and scope is known), it queries the `SymbolTable` and emits `Column` candidates.

## Phase 8: Deterministic Ranking
- Action: `RankingEngine` analyzes each candidate and assigns weights.
- Output: Final array of `CompletionCandidate`, sorted by `finalScore` descending. This is passed to Monaco.
