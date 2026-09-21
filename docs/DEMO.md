# Demo Examples

The application includes 12 curated demo queries that showcase the capabilities of the Context-Aware SQL Autocompletion Engine.

You can load these by clicking the buttons in the "Demo Examples" bar at the bottom of the UI.

## Scenarios Highlighted

### 1. Basic Syntax `SELECT `
Shows syntax-based autocompletion, suggesting columns, keywords, and `*`.

### 2. Table Context `SELECT name FROM `
Shows how the `FROM` clause transitions the parser state to expect `Table` names rather than columns or keywords.

### 3. Alias Dot Access `SELECT s.\nFROM Student s`
Demonstrates **Alias Resolution**. The engine scans ahead to find `FROM Student s`, binds the alias `s` to the `Student` schema, and correctly suggests only `Student` columns when typing `s.`.

### 4. WHERE Clause `SELECT s.name\nFROM Student s\nWHERE `
Shows how the state transitions to `WHERE_START`, expecting boolean operands, columns, or logical keywords.

### 5. Type-Aware Ranking `SELECT s.name\nFROM Student s\nWHERE s.cgpa > `
Because `cgpa` is a `FLOAT`, the engine's Semantic Analyzer knows that a numeric type is expected on the right-hand side of the `>` operator. Type-aware ranking pushes numeric candidates to the top.

### 6. JOIN Scopes `SELECT s.name\nFROM Student s\nJOIN Department d ON s.`
Demonstrates handling multiple aliases. Typing `s.` filters strictly to `Student` columns, ignoring `Department` columns.

### 7. JOIN Context `SELECT s.name\nFROM Student s\nJOIN Department d ON d.`
Contrasts with Scenario 6. Typing `d.` filters strictly to `Department` columns.

### 8. GROUP BY Scope `SELECT s.department_id\nFROM Student s\nGROUP BY `
Shows how clauses isolate expectations, prioritizing columns for grouping.

### 9. ORDER BY Flow `SELECT s.name\nFROM Student s\nORDER BY `
Prioritizes column resolution for sorting.

### 10. Unknown Column Validation `SELECT s.nonexistent\nFROM Student s`
Demonstrates the **Semantic Diagnostics**. An error is generated immediately flagging that `nonexistent` is not found on the `Student` table.

### 11. Ambiguous Column Error `SELECT id\nFROM Student s\nJOIN Department d ON s.department_id = d.id`
If a query uses `id` without an alias (e.g., `s.id`), the engine raises an "Ambiguous Column" diagnostic since `id` exists in both tables.

### 12. Type Mismatch Error `SELECT s.name\nFROM Student s\nWHERE s.cgpa > 'hello'`
The Semantic Analyzer catches the invalid operation of comparing a `FLOAT` to a `TEXT` literal and emits a compiler type error.
