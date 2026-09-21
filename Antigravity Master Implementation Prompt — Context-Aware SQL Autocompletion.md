# MASTER IMPLEMENTATION PROMPT

You are the primary software engineer for this project. Implement the entire project in the current repository from start to finish. Do not merely provide a plan or partial prototype. Create all source files, configuration, tests, documentation, sample data, UI, and runnable commands required for a complete working submission.

Do not ask unnecessary clarification questions. Make reasonable engineering decisions within the specification below. Do not replace the compiler implementation with third-party SQL parsing/autocomplete libraries. The core compiler logic must be implemented by us so that the project can be demonstrated as a genuine Compiler Design microproject.

---

# 1. PROJECT IDENTITY

## Project title

**Context-Aware SQL Autocompletion Using Parser-State and Schema-Aware Semantic Analysis**

## Compiler Design area

**Syntax Analysis + Semantic Analysis**

## Core problem

Build a SQL autocomplete engine that does not rely on keyword popularity or generic text completion.

For every partially typed SQL query, the system must:

1. Lex the current query.
2. Parse the available prefix using a SQL grammar.
3. Determine the current parser state.
4. Determine which grammar symbols/tokens are syntactically valid next.
5. Maintain a database schema symbol table.
6. Resolve tables, aliases, and columns.
7. Perform relevant semantic/type checks.
8. Generate only syntactically and semantically meaningful candidates.
9. Rank candidates deterministically using compiler-derived validity/context signals rather than popularity.
10. Display the result interactively in a professional frontend.

The project is a compiler-oriented intelligent completion engine, not a generic search/autocomplete tool.

---

# 2. NON-NEGOTIABLE PROJECT PRINCIPLES

Follow these rules throughout implementation.

## 2.1 No generic keyword autocomplete

Do not implement:

```text
typed prefix → matching strings
```

as the core mechanism.

Autocomplete suggestions must come from parser state and schema/semantic context.

## 2.2 No popularity-based ranking

Do not use:

- frequency counts
- LLM suggestions
- popularity
- external autocomplete APIs
- machine learning
- language-model probabilities

The ranking must be deterministic and explainable.

## 2.3 No fake compiler architecture

Do not merely use a third-party SQL parser and claim it is our compiler.

Implement our own:

- lexer
- parser
- AST
- parser-state/completion context system
- symbol table
- semantic analyzer
- completion candidate generator
- deterministic ranking engine

Third-party libraries may be used only for UI/editor infrastructure.

## 2.4 Scope SQL deliberately

Do not attempt to implement all SQL.

The project must support a clearly defined SQL subset sufficient to demonstrate:

- SELECT
- FROM
- table aliases
- WHERE
- INNER/LEFT/RIGHT JOIN
- ON
- GROUP BY
- HAVING
- ORDER BY
- ASC/DESC
- LIMIT
- column references
- qualified column references
- comparison operators
- AND/OR/NOT
- literals
- NULL
- basic type checking

The system must explicitly report unsupported constructs rather than pretending to support them.

---

# 3. RECOMMENDED TECH STACK

Use a single cohesive TypeScript project so the core compiler and frontend share types and logic.

## Frontend

- React
- TypeScript
- Vite
- Monaco Editor via `@monaco-editor/react`

## Testing

- Vitest
- React Testing Library where useful

## Visualization

Prefer a lightweight custom tree renderer for AST/query structures rather than introducing unnecessary infrastructure.

## Styling

Use a clean professional interface. A utility CSS framework is acceptable, but do not overengineer the UI.

No backend is required for the minimum viable implementation.

The schema should be represented through a typed schema catalog stored locally in the project, with an editable/importable representation.

---

# 4. PROJECT ARCHITECTURE

Create a structure approximately like:

```text
src/
├── compiler/
│   ├── lexer/
│   │   ├── token.ts
│   │   └── lexer.ts
│   │
│   ├── parser/
│   │   ├── grammar.ts
│   │   ├── parser.ts
│   │   ├── parserState.ts
│   │   └── prefixParser.ts
│   │
│   ├── ast/
│   │   └── nodes.ts
│   │
│   ├── semantic/
│   │   ├── types.ts
│   │   ├── symbolTable.ts
│   │   └── semanticAnalyzer.ts
│   │
│   ├── completion/
│   │   ├── completionContext.ts
│   │   ├── candidateGenerator.ts
│   │   ├── candidateTypes.ts
│   │   └── ranking.ts
│   │
│   ├── diagnostics/
│   │   └── diagnostics.ts
│   │
│   └── pipeline.ts
│
├── schema/
│   ├── schemaTypes.ts
│   ├── sampleSchema.ts
│   └── schemaCatalog.ts
│
├── editor/
│   └── monacoCompletionProvider.ts
│
├── components/
│   ├── SQLEditor.tsx
│   ├── SchemaPanel.tsx
│   ├── CompletionPanel.tsx
│   ├── ParserStatePanel.tsx
│   ├── SemanticDiagnosticsPanel.tsx
│   ├── ASTViewer.tsx
│   ├── CandidateRankingPanel.tsx
│   └── DemoExamples.tsx
│
├── App.tsx
├── main.tsx
└── styles/
    └── ...
    
tests/
├── lexer/
├── parser/
├── semantic/
├── completion/
├── ranking/
└── integration/
```

Adapt names when useful, but preserve the conceptual separation.

---

# 5. SQL SUBSET

Implement this grammar or an equivalent formally documented grammar.

Use:

```text
query
    ::= SELECT selectList
        FROM fromItem
        joinClause*
        whereClause?
        groupByClause?
        havingClause?
        orderByClause?
        limitClause?

selectList
    ::= selectItem (',' selectItem)*

selectItem
    ::= '*'
      | columnReference alias?

fromItem
    ::= tableName alias?

joinClause
    ::= joinType? JOIN tableName alias? ON condition

joinType
    ::= INNER
      | LEFT
      | RIGHT

whereClause
    ::= WHERE condition

groupByClause
    ::= GROUP BY columnReference (',' columnReference)*

havingClause
    ::= HAVING condition

orderByClause
    ::= ORDER BY orderItem (',' orderItem)*

orderItem
    ::= columnReference (ASC | DESC)?

limitClause
    ::= LIMIT integer

condition
    ::= orExpression

orExpression
    ::= andExpression (OR andExpression)*

andExpression
    ::= notExpression (AND notExpression)*

notExpression
    ::= NOT notExpression
      | comparison
      | '(' condition ')'

comparison
    ::= operand comparisonOperator operand
      | operand IS NULL
      | operand IS NOT NULL

operand
    ::= columnReference
      | literal

columnReference
    ::= identifier
      | identifier '.' identifier

comparisonOperator
    ::= '='
      | '!='
      | '<>'
      | '<'
      | '<='
      | '>'
      | '>='
      | LIKE

literal
    ::= integer
      | decimal
      | string
      | NULL
      | TRUE
      | FALSE
```

It is acceptable to extend this grammar slightly when needed, but do not substantially expand scope without a strong reason.

---

# 6. LEXICAL ANALYZER

Implement a real lexer.

The lexer must tokenize at minimum:

## Keywords

```text
SELECT
FROM
WHERE
JOIN
INNER
LEFT
RIGHT
ON
GROUP
BY
HAVING
ORDER
ASC
DESC
LIMIT
AND
OR
NOT
IS
NULL
LIKE
TRUE
FALSE
AS
```

## Token types

```text
KEYWORD
IDENTIFIER
INTEGER
DECIMAL
STRING
OPERATOR
COMMA
DOT
LPAREN
RPAREN
STAR
EOF
UNKNOWN
```

## Lexer requirements

- track line
- track column
- track character offsets
- preserve original token text
- normalize keyword recognition case-insensitively
- detect malformed string literals
- detect unknown characters
- expose token spans for editor diagnostics

Add comprehensive lexer tests.

---

# 7. AST

Define strongly typed AST nodes.

At minimum:

```text
Query
SelectClause
SelectItem
FromClause
TableReference
JoinClause
WhereClause
GroupByClause
HavingClause
OrderByClause
OrderItem
LimitClause

ColumnReference
Literal
BinaryExpression
UnaryExpression
IsNullExpression
```

Every AST node should contain source-location information.

Do not represent the entire query as an unstructured JSON object.

Use explicit TypeScript discriminated unions or equivalent typed structures.

---

# 8. COMPLETE-QUERY PARSER

Implement a normal recursive-descent parser for complete supported queries.

The parser must:

- produce the AST
- report syntax errors
- provide expected-token information
- preserve token/source locations
- distinguish clauses correctly
- resolve no semantics itself

Keep syntax analysis separate from semantic analysis.

---

# 9. PREFIX / INCREMENTAL PARSER

This is one of the most important components.

The user will often type incomplete SQL such as:

```sql
SELECT
```

or:

```sql
SELECT name FROM Student WHERE
```

or:

```sql
SELECT s.
```

The parser must not simply throw an error and stop.

Implement a tolerant prefix parser that examines the currently typed SQL and returns a structured completion context.

Define parser states such as:

```text
START
AFTER_SELECT
SELECT_LIST
AFTER_SELECT_ITEM
EXPECT_FROM
FROM_TABLE
AFTER_FROM_TABLE
EXPECT_JOIN_OR_CLAUSE
JOIN_TABLE
JOIN_AFTER_TABLE
EXPECT_ON
JOIN_CONDITION
WHERE_START
WHERE_OPERAND
WHERE_OPERATOR
WHERE_RIGHT_OPERAND
WHERE_BOOLEAN_OPERATOR
GROUP_BY_START
GROUP_BY_COLUMN
HAVING_START
ORDER_BY_START
ORDER_BY_COLUMN
ORDER_DIRECTION
LIMIT_START
LIMIT_VALUE
QUERY_COMPLETE
UNKNOWN_RECOVERY
```

The exact state structure may be refined, but the concept must be explicit.

The prefix parser must return:

```text
{
    parserState,
    expectedTokenKinds,
    expectedKeywords,
    activeClause,
    activeAliases,
    currentPrefix,
    currentToken,
    partialAst,
    diagnostics
}
```

This parser-state object is one of the project's main demonstration artifacts.

---

# 10. SCHEMA CATALOG

Create a sample schema such as:

```text
Student
    id           INT
    name         TEXT
    department_id INT
    cgpa         FLOAT

Department
    id           INT
    name         TEXT

Course
    id           INT
    name         TEXT
    credits      INT
    department_id INT

Enrollment
    student_id   INT
    course_id    INT
    semester     TEXT
    grade        TEXT
```

Represent schema information using typed structures.

For each table support:

```text
table name
columns
column types
primary key information where useful
foreign key relationships where useful
```

Provide at least one additional small schema for testing.

---

# 11. SYMBOL TABLE

Implement a compiler-style symbol table.

It must track:

```text
tables
aliases
columns
column types
query-scope visibility
```

The symbol table must support:

- table lookup
- alias lookup
- column lookup
- qualified column lookup
- unqualified column lookup
- ambiguous-column detection
- scope-aware resolution

For example:

```sql
FROM Student s
JOIN Department d ON ...
```

creates:

```text
s → Student
d → Department
```

and:

```text
s.cgpa
```

resolves to:

```text
Student.cgpa : FLOAT
```

---

# 12. SEMANTIC ANALYSIS

Implement a real semantic analyzer.

Required checks:

## Table resolution

Detect unknown table names.

## Alias resolution

Detect:

- unknown aliases
- duplicate aliases
- invalid alias references

## Column resolution

Detect:

- unknown columns
- ambiguous unqualified columns
- invalid qualified columns

## Type checking

Support at minimum:

```text
INT
FLOAT
TEXT
BOOLEAN
NULL
UNKNOWN
```

Check:

```text
numeric > numeric     valid
text = text            valid
numeric > text         invalid
boolean AND boolean    valid
text AND text          invalid
```

Implement sensible implicit numeric compatibility:

```text
INT ↔ FLOAT
```

but do not create a complicated conversion system.

## Boolean conditions

Require Boolean-compatible expressions in:

```text
WHERE
ON
HAVING
```

## GROUP BY

Detect invalid non-grouped references according to the supported subset.

## ORDER BY

Resolve referenced columns.

## LIMIT

Require integer-compatible values.

---

# 13. COMPLETION CONTEXT ENGINE

Create a dedicated `CompletionContext` abstraction.

Given the current cursor position, determine:

```text
where the cursor is
what clause is active
what syntactic category is expected
what aliases are visible
what tables are visible
what columns are visible
what datatype is expected
what candidate kinds are valid
```

Examples:

### Input

```sql
SELECT 
```

Context:

```text
state = SELECT_LIST
expected = [COLUMN, STAR, DISTINCT-like supported modifiers if implemented]
```

### Input

```sql
SELECT name FROM 
```

Context:

```text
state = FROM_TABLE
expected = [TABLE]
```

### Input

```sql
SELECT s. FROM Student s
```

Context:

```text
state = COLUMN_REFERENCE
visibleAlias = s
expected = [COLUMN]
```

### Input

```sql
SELECT s.name
FROM Student s
WHERE 
```

Context:

```text
state = WHERE_OPERAND
expected = [COLUMN, LITERAL, possibly NOT]
```

### Input

```sql
SELECT s.name
FROM Student s
WHERE s.cgpa >
```

Context:

```text
state = WHERE_RIGHT_OPERAND
expectedType = NUMERIC
```

### Input

```sql
... ORDER BY s.
```

Context:

```text
state = ORDER_BY_COLUMN
visibleAlias = s
expected = [COLUMN]
```

---

# 14. COMPLETION CANDIDATE GENERATION

Define a typed candidate structure:

```text
CompletionCandidate {
    label
    insertText
    kind
    detail
    source
    syntaxScore
    semanticScore
    typeScore
    contextScore
    prefixScore
    finalScore
    explanation
}
```

Possible candidate kinds:

```text
KEYWORD
TABLE
ALIAS
COLUMN
OPERATOR
FUNCTION if supported
LITERAL
CLAUSE
DIRECTION
```

Generate candidates from two major sources.

## Source A: grammar/parser state

Examples:

```text
SELECT
FROM
WHERE
JOIN
ON
GROUP BY
HAVING
ORDER BY
LIMIT
AND
OR
NOT
ASC
DESC
```

only when the parser state permits them.

## Source B: schema/symbol table

Examples:

```text
Student
Department
Course
Enrollment
s
d
c
e
s.id
s.name
s.cgpa
d.name
```

only when the semantic context permits them.

Never show schema candidates in contexts where the grammar does not allow expressions/table names.

---

# 15. DETERMINISTIC RANKING ENGINE

This is a critical project feature.

Do NOT use popularity.

Do NOT use machine learning.

Do NOT query an external AI service.

Implement a deterministic scoring system.

Suggested formula:

```text
finalScore =
    0.35 * syntaxScore
  + 0.30 * semanticScore
  + 0.15 * typeScore
  + 0.10 * contextScore
  + 0.10 * prefixScore
```

Normalize all scores to [0, 1].

## Syntax score

Measure whether the candidate is valid under the current parser state.

Possible model:

```text
1.00 = directly valid next grammar symbol
0.75 = valid with a very small completion transition
0.00 = syntactically invalid
```

Prefer direct valid candidates.

## Semantic score

```text
1.00 = resolves cleanly using schema/symbol table
0.75 = valid but weakly constrained
0.00 = semantically invalid
```

Examples:

- existing table = high
- existing alias = high
- existing visible column = high
- nonexistent column = 0
- ambiguous column = penalized

## Type score

Examples:

If the expression expects a numeric value:

```text
INT/FLOAT candidate → 1.0
TEXT candidate → 0
```

## Context score

Prefer candidates whose meaning fits the active clause.

Example:

In `ORDER BY`, columns relevant to the visible query should outrank unrelated grammar candidates.

## Prefix score

Use ordinary deterministic prefix matching:

```text
candidate starts with typed prefix → 1
partial match → lower
no match → 0
```

Do not treat prefix matching as the main intelligence.

## Tie-breaking

For equal scores, use deterministic ordering:

1. exact prefix match
2. semantic validity
3. candidate-kind priority
4. alphabetical order

The result must be reproducible every time.

---

# 16. RANKING EXPLANATION

Every displayed candidate should have an explanation.

Example:

```text
s.cgpa

Syntax:      1.00
Semantic:    1.00
Type:        1.00
Context:     1.00
Prefix:      0.80
Final:       0.98

Why:
- valid column expression in current parser state
- alias `s` resolves to `Student`
- `cgpa` exists on Student
- column type is FLOAT
```

This feature is important for demonstrating that the system is compiler-driven rather than a black box.

---

# 17. MONACO EDITOR INTEGRATION

Integrate the completion engine into Monaco.

The user should be able to type SQL naturally and receive suggestions.

Requirements:

- completion triggers after typing
- suggestions can be manually triggered
- candidates are ranked using our engine
- accepted suggestion inserts `insertText`
- suggestions show kind/detail
- invalid suggestions are not presented
- parser state updates after every edit
- semantic diagnostics update after every edit

Do not replace the compiler with Monaco's built-in SQL completion logic.

Monaco is only the UI/editor host.

---

# 18. MAIN UI

Create a professional single-page application.

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Project title / description                                 │
├───────────────────────────────┬─────────────────────────────┤
│                               │ Schema Catalog              │
│        SQL EDITOR             │                             │
│                               │ Student                     │
│                               │ Department                  │
│                               │ Course                      │
│                               │ Enrollment                  │
├───────────────────────────────┼─────────────────────────────┤
│ Completion Suggestions        │ Parser State                │
│                               │                             │
│ 1. s.cgpa                     │ SELECT_LIST                 │
│ 2. s.department_id            │ Expected: COLUMN, ...       │
│ ...                           │                             │
├───────────────────────────────┼─────────────────────────────┤
│ Semantic Diagnostics          │ AST / Query Structure       │
│                               │                             │
└───────────────────────────────┴─────────────────────────────┘
```

The UI should expose compiler internals rather than hiding them.

---

# 19. REQUIRED UI PANELS

## 19.1 SQL Editor

Main Monaco editor.

## 19.2 Schema Panel

Show:

- tables
- columns
- types
- relationships where supported

## 19.3 Completion Panel

Show top-ranked candidates.

For each:

```text
candidate
kind
score
why it was selected
```

## 19.4 Parser State Panel

Show:

```text
Current state
Active clause
Expected tokens
Current prefix
Visible aliases
```

## 19.5 Semantic Diagnostics

Show errors/warnings:

```text
Unknown table
Unknown column
Ambiguous column
Type mismatch
Invalid clause context
```

## 19.6 AST Viewer

Render the currently parsed portion of the query.

## 19.7 Demo Examples

Provide buttons to load curated examples.

---

# 20. REQUIRED DEMO QUERIES

Create at least these examples.

## Demo 1 — SELECT completion

```sql
SELECT 
```

Expected candidates should primarily be columns / `*` depending on the schema/query context.

## Demo 2 — table completion

```sql
SELECT name FROM 
```

Expected candidates:

```text
Student
Department
Course
Enrollment
```

## Demo 3 — alias-aware column completion

```sql
SELECT s.
FROM Student s
```

Expected:

```text
s.id
s.name
s.department_id
s.cgpa
```

## Demo 4 — WHERE completion

```sql
SELECT s.name
FROM Student s
WHERE 
```

Expected column/operator choices.

## Demo 5 — type-aware completion

```sql
SELECT s.name
FROM Student s
WHERE s.cgpa >
```

The system should understand that `cgpa` is FLOAT/numeric and rank compatible candidates appropriately.

## Demo 6 — JOIN semantic context

```sql
SELECT s.name
FROM Student s
JOIN Department d ON s.
```

Only Student columns should be offered for `s.`.

## Demo 7 — JOIN other alias

```sql
SELECT s.name
FROM Student s
JOIN Department d ON d.
```

Only Department columns should be offered for `d.`.

## Demo 8 — GROUP BY

```sql
SELECT s.department_id
FROM Student s
GROUP BY 
```

Expected column candidates.

## Demo 9 — ORDER BY

```sql
SELECT s.name
FROM Student s
ORDER BY 
```

Expected visible columns plus ASC/DESC where syntactically appropriate.

## Demo 10 — semantic error

```sql
SELECT s.nonexistent
FROM Student s
```

Show:

```text
Unknown column: s.nonexistent
```

and do not rank it as a valid completion candidate elsewhere.

## Demo 11 — ambiguous column

```sql
SELECT id
FROM Student s
JOIN Department d ON s.department_id = d.id
```

If both sources expose `id`, show the ambiguity.

## Demo 12 — invalid type comparison

```sql
SELECT s.name
FROM Student s
WHERE s.cgpa > 'hello'
```

Show a semantic type mismatch.

---

# 21. TESTING REQUIREMENTS

Do not finish without tests.

## Lexer tests

At minimum:

- keyword recognition
- identifiers
- numbers
- strings
- operators
- punctuation
- malformed strings
- unknown characters

## Parser tests

Test valid:

```text
SELECT
SELECT FROM
SELECT WHERE
SELECT JOIN
SELECT GROUP BY
SELECT ORDER BY
SELECT LIMIT
```

and invalid forms.

## Prefix parser tests

Test that the correct state is produced for each demo query.

## Semantic tests

At minimum:

- valid table
- invalid table
- valid column
- invalid column
- valid alias
- invalid alias
- ambiguous column
- valid numeric comparison
- invalid numeric/text comparison
- invalid Boolean expression

## Completion tests

For each demo input, assert that expected candidates appear and invalid candidates do not.

## Ranking tests

Verify exact deterministic ordering for several scenarios.

The same query and schema must always produce the same ranking.

## Integration tests

Test:

```text
editor text
→ compiler pipeline
→ parser state
→ semantic analysis
→ candidates
→ ranking
```

---

# 22. IMPORTANT EDGE CASES

Handle:

- mixed-case SQL keywords
- whitespace changes
- cursor at end of query
- cursor after `alias.`
- incomplete identifiers
- incomplete keywords
- incomplete WHERE expressions
- trailing commas
- trailing spaces
- incomplete JOIN
- incomplete ON expression
- incomplete GROUP BY
- incomplete ORDER BY
- incomplete LIMIT
- invalid table alias
- ambiguous identifiers
- unknown identifiers
- unsupported constructs

Do not crash on malformed input.

The application must remain responsive when the user enters invalid/incomplete SQL.

---

# 23. ERROR HANDLING

Every layer must fail gracefully.

The UI must never show a blank screen because the SQL is incomplete.

Return structured diagnostics rather than throwing uncontrolled exceptions.

Each diagnostic should contain:

```text
severity
message
source span
code/category
optional suggestion
```

---

# 24. PERFORMANCE REQUIREMENT

The completion engine must feel interactive for small queries.

Do not implement a full SQL parser on every keystroke if avoidable.

Use straightforward memoization/caching where useful, but do not overengineer.

For the supported query sizes, completion should update effectively immediately in the browser.

---

# 25. DOCUMENTATION

Create at least:

```text
README.md
docs/ARCHITECTURE.md
docs/GRAMMAR.md
docs/COMPILER_PIPELINE.md
docs/RANKING.md
docs/DEMO.md
docs/TESTING.md
```

## README

Explain:

- project title
- problem statement
- objectives
- compiler phases used
- architecture
- setup
- run commands
- screenshots/placeholders if appropriate
- limitations

## ARCHITECTURE

Explain:

```text
Lexer
Parser
AST
Prefix Parser
Symbol Table
Semantic Analyzer
Completion Generator
Ranking Engine
Editor
```

## GRAMMAR

Document the exact supported SQL grammar.

## COMPILER_PIPELINE

Explain how:

```text
partial SQL
→ tokens
→ parser state
→ AST/context
→ semantic environment
→ candidates
→ ranking
```

works.

## RANKING

Document every score and formula.

## DEMO

Give a step-by-step 5–10 minute classroom demonstration.

## TESTING

Explain test categories and results.

---

# 26. CREATE A CLASSROOM DEMONSTRATION MODE

Add a Demo Examples section that lets the user instantly load predefined examples.

The demo should visibly prove:

1. syntax state changes
2. schema context changes
3. candidate list changes
4. ranking changes
5. invalid identifiers get rejected
6. type-aware behavior works
7. aliases change available columns

The professor should be able to see the compiler logic rather than merely seeing autocomplete popups.

---

# 27. REQUIRED PROJECT TERMINOLOGY

Use these terms consistently in the code and documentation:

- lexical analysis
- syntax analysis
- parser state
- prefix parsing
- abstract syntax tree
- semantic analysis
- symbol table
- scope
- name resolution
- type checking
- completion context
- candidate generation
- deterministic ranking
- syntactic validity
- semantic validity

Do not describe the system as simply "AI autocomplete."

It is **compiler-driven SQL completion**.

---

# 28. WHAT NOT TO IMPLEMENT

Do NOT add these unless absolutely necessary:

- machine learning
- LLM API
- cloud database
- authentication
- user accounts
- backend server
- real-time collaboration
- full SQL standard
- query execution engine
- database administration
- SQL optimizer
- natural-language-to-SQL

These create scope without improving the core research/Compiler Design contribution.

---

# 29. OPTIONAL ENHANCEMENTS

Only implement these after the mandatory project is complete and tested.

Potential enhancements:

## A. Import schema from simple CREATE TABLE statements

Allow:

```sql
CREATE TABLE Student (...);
```

to populate the symbol table.

## B. Candidate score visualization

Show a bar chart or table of:

```text
syntax
semantic
type
context
prefix
final
```

## C. Suggestion explanations

Explain why a candidate is ranked above another.

## D. Additional SQL clause support

Only after core requirements are stable.

## E. Subquery-aware completion

Optional advanced feature.

Do not allow optional enhancements to destabilize the core project.

---

# 30. ACCEPTANCE CRITERIA

The project is considered COMPLETE only when all of the following are true.

## Compiler implementation

- [ ] custom lexer works
- [ ] custom parser works
- [ ] AST exists
- [ ] prefix parser works
- [ ] parser states are explicit
- [ ] symbol table exists
- [ ] semantic analyzer exists
- [ ] type checker exists
- [ ] completion-context engine exists
- [ ] candidate generator exists
- [ ] deterministic ranking exists

## Autocomplete

- [ ] SQL keywords are suggested only in valid contexts
- [ ] table names are suggested only when table names are expected
- [ ] columns are resolved through schema
- [ ] aliases work
- [ ] qualified columns work
- [ ] ambiguous columns are detected
- [ ] type-aware ranking works
- [ ] invalid suggestions are excluded
- [ ] ranking does not use popularity

## Interface

- [ ] Monaco SQL editor works
- [ ] completion suggestions appear
- [ ] schema panel works
- [ ] parser-state panel works
- [ ] semantic diagnostics work
- [ ] AST viewer works
- [ ] demo examples work
- [ ] ranking explanations work

## Engineering

- [ ] all tests pass
- [ ] production build succeeds
- [ ] no TypeScript errors
- [ ] no console errors during normal usage
- [ ] README contains setup instructions
- [ ] architecture documentation exists
- [ ] grammar documentation exists
- [ ] ranking documentation exists
- [ ] demo documentation exists

---

# 31. DEVELOPMENT PROCESS

Implement the project in these phases.

## Phase 1 — Repository setup

Create:

- React/Vite/TypeScript project
- linting/formatting if useful
- test infrastructure
- initial README

Then verify the application starts.

## Phase 2 — Lexer

Implement lexer + token model + tests.

Run tests.

## Phase 3 — AST + parser

Implement AST and complete-query parser.

Run tests.

## Phase 4 — Prefix parser

Implement parser-state engine and completion contexts.

Run tests.

## Phase 5 — Schema + symbol table

Implement sample schema, lookup, aliases, scopes.

Run tests.

## Phase 6 — Semantic analyzer

Implement name resolution and type checking.

Run tests.

## Phase 7 — Candidate generator

Generate grammar and schema candidates from completion state.

Run tests.

## Phase 8 — Deterministic ranking

Implement scoring and explanations.

Run tests.

## Phase 9 — Monaco integration

Connect compiler engine to editor completions.

Run application.

## Phase 10 — Visualization/UI

Add:

- schema
- parser state
- diagnostics
- AST
- ranking explanations
- demo examples

## Phase 11 — Integration testing

Exercise the complete pipeline against all required demo queries.

## Phase 12 — Documentation and cleanup

Finish all documentation.

Run:

```text
npm test
npm run build
```

and any configured lint/typecheck commands.

Fix every failure before considering the project complete.

---

# 32. QUALITY BAR

Do not settle for a visually attractive prototype with shallow compiler logic.

The most important files are the compiler files.

The reviewer should be able to inspect the source code and clearly find:

```text
Lexer
Parser
Parser State
AST
Symbol Table
Semantic Analyzer
Completion Generator
Ranking Engine
```

The UI is the demonstration layer.

The compiler implementation is the actual project.

---

# 33. FINAL DEMONSTRATION SCENARIO

When the application starts, load:

```sql
SELECT s.name
FROM Student s
WHERE s.
```

Show the suggestions.

Then change to:

```sql
SELECT s.name
FROM Student s
WHERE s.cgpa >
```

Show how semantic/type context changes.

Then change to:

```sql
SELECT s.name
FROM Student s
JOIN Department d ON d.
```

Show the visible schema namespace changing from Student to Department.

Then introduce:

```sql
SELECT s.nonexistent
FROM Student s
```

and demonstrate the semantic error.

Then introduce:

```sql
SELECT s.name
FROM Student s
WHERE s.cgpa > 'hello'
```

and demonstrate type checking.

Finally show the parser-state panel and ranking explanation for a suggestion.

The demonstration must make it obvious that the system understands:

```text
WHAT CAN APPEAR NEXT?
+
WHAT MAKES SENSE HERE?
```

rather than simply:

```text
WHAT WORDS ARE POPULAR?
```

---

# 34. FINAL DELIVERABLES

At the end, the repository must contain:

1. Complete working application.
2. Full compiler implementation.
3. Tests.
4. Sample schema.
5. Demo queries.
6. Documentation.
7. Build/run instructions.
8. No placeholder TODOs for required functionality.
9. No fake/mock implementation of required compiler logic.
10. A clean final build.

After implementation, provide a concise final report containing:

```text
- what was implemented
- file structure
- commands to run
- tests passed
- build status
- supported SQL subset
- known limitations
- exact classroom demonstration flow
```

Do not stop after generating files. Run the application and tests, inspect failures, fix them, and verify the final build.

The final system must be genuinely usable from a fresh clone/install according to the README.