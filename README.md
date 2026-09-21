# Context-Aware SQL Autocompletion Engine

A compiler-driven SQL autocomplete engine built as a comprehensive **Compiler Design Microproject**.

Unlike typical editor extensions that use generic text-matching, regular expressions, or LLMs, this project implements a complete **custom SQL compiler pipeline** from scratch in TypeScript. It parses the SQL query as it is being typed (even when syntactically incomplete), builds an AST, performs semantic analysis against a schema catalog, and deterministically ranks completion candidates based on syntactical validity, type compatibility, and contextual relevance.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run the test suite (100+ tests)
npm run test
```

## 🏗️ Architecture

The autocompletion engine is built as a multi-phase compiler pipeline:

1. **Lexical Analysis (`src/compiler/lexer/`)**
   Scans the raw SQL string into a stream of tokens, preserving source locations (line, column, offset) and handling identifiers, keywords, numbers, strings, and operators.

2. **Syntax Analysis / Parsing (`src/compiler/parser/`)**
   - **Recursive-Descent Parser**: Builds a complete Abstract Syntax Tree (AST) for fully valid queries.
   - **Tolerant Prefix Parser**: A specialized state machine designed to parse *incomplete* SQL strings up to the cursor position. It determines the current `ParserState` (e.g., `WHERE_OPERAND`, `JOIN_TABLE`, `DOT_ACCESS`), the active clause, and the expected syntax tokens.

3. **Semantic Analysis (`src/compiler/semantic/`)**
   - **Symbol Table**: Extracts and tracks table declarations and aliases (e.g., `FROM Student s`) to resolve scoped column references.
   - **Type Checking**: Validates expression types (e.g., ensuring `cgpa > 3.5` compares numeric types, while `cgpa > 'text'` produces a diagnostic error).
   - **Diagnostics**: Produces structured error/warning messages for unknown tables, ambiguous columns, and type mismatches.

4. **Candidate Generation (`src/compiler/completion/candidateGenerator.ts`)**
   Combines grammar-based suggestions (keywords, clauses, operators) with schema-based suggestions (tables, columns, aliases) filtered by the current parser state and active scope.

5. **Deterministic Ranking Engine (`src/compiler/completion/ranking.ts`)**
   Scores and ranks completion candidates using a transparent, weighted formula:
   - **Syntax Score (35%)**: Is the candidate syntactically valid in the current parser state?
   - **Semantic Score (30%)**: Does the column/alias actually exist in the schema or symbol table?
   - **Type Score (15%)**: Does the column's data type match the expected context (e.g., numeric expected after `>`?)
   - **Context Score (10%)**: Is this candidate highly relevant for the active clause (e.g., tables preferred in `FROM`, columns preferred in `WHERE`)?
   - **Prefix Score (10%)**: Does the candidate match what the user has already typed?

## 💻 User Interface

The React frontend (`src/App.tsx`) acts as an interactive debugger for the compiler pipeline. As you type in the Monaco Editor, the pipeline runs instantaneously, updating several insight panels:
- **SQL Editor**: The primary input area.
- **Completion Candidates**: The ranked list of suggestions with visual score bars.
- **Parser State**: Exposes the internal state of the Prefix Parser (expected tokens, active aliases).
- **Semantic Diagnostics**: Real-time type-checking and name-resolution errors.
- **AST Viewer**: A hierarchical view of the parsed query tree.
- **Ranking Detail**: A breakdown of *why* a specific candidate received its score.

## 🧪 Testing

The project includes a robust Vitest suite covering all compiler phases:
- **Lexer Tests**: Keywords, literals, operators, and position tracking.
- **Parser Tests**: AST construction, valid/invalid query structures.
- **Semantic Tests**: Name resolution, scope visibility, and type compatibility.
- **Integration Tests**: End-to-end verification from raw SQL to ranked candidates.
