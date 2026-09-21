# Testing Strategy

The project employs a comprehensive, decoupled testing strategy utilizing **Vitest**. The test suite currently includes over 100 isolated tests that execute in < 1 second.

## Running Tests

```bash
npm run test
```

## Test Suites

The tests are organized into modules matching the compiler pipeline phases:

### 1. Lexer Tests (`tests/lexer/lexer.test.ts`)
Validates that raw strings are correctly grouped into tokens.
- **Coverage**: Keywords, identifiers, literals (int, float, string), operators.
- **Robustness**: Verifies the lexer handles unknown characters and malformed strings gracefully without crashing, emitting `UNKNOWN` tokens instead.

### 2. AST Parser Tests (`tests/parser/parser.test.ts`)
Validates the construction of the Abstract Syntax Tree.
- **Coverage**: Ensures `SELECT`, `FROM`, `WHERE`, `JOIN`, `GROUP BY`, `ORDER BY`, and `LIMIT` nodes are correctly structured.
- **Validation**: Checks that binary expressions (e.g., `A = B AND C > D`) preserve operator precedence and associativity.

### 3. Prefix Parser Tests (`tests/parser/prefixParser.test.ts`)
Validates the tolerant state-machine parser.
- **Coverage**: Checks that incomplete strings up to a specific cursor position yield the correct `ParserState`.
- **Validation**: Essential for auto-complete stability; tests cover edge cases like trailing dots (`s.`), half-typed keywords, and missing clauses.

### 4. Semantic Analyzer Tests (`tests/semantic/semanticAnalyzer.test.ts`)
Validates business logic and strict SQL correctness.
- **Coverage**: Alias resolution, table resolution, column ambiguity.
- **Validation**: Generates expected `DiagnosticCodes` (e.g. `TYPE_MISMATCH` when comparing `INT` > `TEXT`).

### 5. Symbol Table Tests (`tests/semantic/symbolTable.test.ts`)
Validates scope isolation.
- **Coverage**: Table registration, alias isolation, qualified column resolution.

### 6. Candidate Generator Tests (`tests/completion/candidateGenerator.test.ts`)
Validates that the correct *pool* of candidates is selected.
- **Coverage**: Verifies that tables are suggested after `FROM`, columns are suggested after `WHERE`, and that alias scopes (`s.`) strictly limit suggestions to the `Student` schema.

### 7. Ranking Tests (`tests/ranking/ranking.test.ts`)
Validates sorting determinism.
- **Coverage**: Ensures scores remain inside the strict `[0, 1]` bounds and that identical contexts yield identically ordered lists without flaky behavior.

### 8. Pipeline Integration Tests (`tests/integration/pipeline.test.ts`)
End-to-End testing.
- **Coverage**: Passes raw strings and mock cursors into the `runPipeline` entrypoint and asserts that the final output includes expected parsed ASTs, exact candidate labels, and exact diagnostics.
