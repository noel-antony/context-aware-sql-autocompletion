# Architecture

The Context-Aware SQL Autocompletion Engine is built as a complete custom compiler pipeline rather than relying on regular expressions or standard editor plugins.

## High-Level Architecture

The system operates in a single web worker / main thread pipeline (via Monaco Editor's CompletionItemProvider), entirely written in TypeScript. 

When a user types in the editor, the string is passed through the pipeline:

1. **Raw Source String**
2. **Lexer** → Token Stream
3. **Dual Parsers**:
   - **Prefix Parser** → Extracts contextual state up to the cursor (Tolerant).
   - **AST Parser** → Builds a full AST (if valid syntax).
4. **Symbol Table & Schema Catalog** → Resolves environment bindings.
5. **Semantic Analyzer** → Produces Diagnostics (Errors, Warnings).
6. **Candidate Generator** → Yields raw completion candidates based on context.
7. **Ranking Engine** → Scores candidates (0 to 1) based on semantics, typing, and context.
8. **Monaco Provider** → Formats candidates into `monaco.languages.CompletionItem`.

## Key Architectural Decisions

- **In-Browser Execution**: There is no Node.js backend. Everything runs within the client, making it extremely fast (latency < 10ms).
- **Two-Pass Parsing**: Traditional parsers fail when the user hasn't finished typing. We use a custom "Prefix Parser" that behaves as a state machine. It accepts incomplete input and reports *what the compiler expects next*.
- **Compiler Symbol Table**: Typical autocompletes just list all tables. This engine maintains a scope. When it sees `FROM Student s`, the alias `s` and its columns are bound to the current context.

## Technology Stack

- **Core**: TypeScript (Strict mode enabled)
- **UI Framework**: React, Vite
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Testing**: Vitest
