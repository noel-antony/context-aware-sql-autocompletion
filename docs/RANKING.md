# Deterministic Ranking System

The core requirement of this autocomplete engine is to avoid LLM hallucination and popularity-based sorting. Results must be 100% deterministic and context-aware.

## Scoring Formula

Each completion candidate receives a score from 0.0 to 1.0 based on five weighted metrics:

```typescript
const finalScore = 
  (syntaxScore * 0.35) +
  (semanticScore * 0.30) +
  (typeScore * 0.15) +
  (contextScore * 0.10) +
  (prefixScore * 0.10);
```

### 1. Syntax Score (35%)
Does this candidate mathematically fit the current node of the EBNF grammar?
- **1.0**: Perfect grammatical fit (e.g., `SELECT` at the very beginning of the string).
- **0.0**: Illegal in this position (e.g., suggesting `WHERE` immediately after `SELECT`).

### 2. Semantic Score (30%)
Does this identifier actually exist?
- **1.0**: Exists in the schema or the local symbol table.
- **0.0**: Made-up identifier, or a column from a table not referenced in the `FROM` clause.

### 3. Type Score (15%)
If the parser can deduce the expected type, does the candidate match?
- Example: `WHERE s.name = ...` expects a `TEXT` column.
- **1.0**: Exact match (`TEXT`).
- **0.5**: Compatible match (e.g., `FLOAT` expected, `INT` supplied).
- **0.0**: Type clash (`TEXT` expected, `INT` supplied).

### 4. Context Score (10%)
Does this candidate conceptually align with the current active SQL clause?
- **1.0**: Suggesting a Table in a `FROM` or `JOIN` clause, or a Column in `SELECT`/`WHERE`.
- **0.0**: Suggesting a Table in a `SELECT` clause (valid in some SQL dialects, but lower priority).

### 5. Prefix Score (10%)
How closely does the candidate match what the user has currently typed?
- **1.0**: Exact, case-sensitive prefix match.
- **0.5**: Case-insensitive substring match.
- **0.0**: No match.

## Tie Breaking

When two candidates have the exact same `finalScore`, they are sorted alphabetically to guarantee strict determinism.
