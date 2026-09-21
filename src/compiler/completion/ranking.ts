/**
 * Deterministic Ranking Engine
 *
 * Scores and ranks completion candidates using a weighted formula
 * based on syntactic validity, semantic resolution, type compatibility,
 * context relevance, and prefix matching.
 *
 * Formula:
 *   finalScore = 0.35 * syntaxScore
 *              + 0.30 * semanticScore
 *              + 0.15 * typeScore
 *              + 0.10 * contextScore
 *              + 0.10 * prefixScore
 *
 * No popularity, no ML, no LLM — purely deterministic and explainable.
 */

import { CompletionCandidate, CandidateKind } from './candidateTypes';
import { CompletionContextResult, ParserState, ActiveClause } from '../parser/parserState';
import { ColumnType } from '../../schema/schemaTypes';
import { isNumericType, isTextType, isBooleanType } from '../semantic/types';

// ─── Weights ───────────────────────────────────────────────────────

const SYNTAX_WEIGHT = 0.35;
const SEMANTIC_WEIGHT = 0.30;
const TYPE_WEIGHT = 0.15;
const CONTEXT_WEIGHT = 0.10;
const PREFIX_WEIGHT = 0.10;

// ─── Kind Priority for tie-breaking ────────────────────────────────

const KIND_PRIORITY: Record<CandidateKind, number> = {
  [CandidateKind.COLUMN]: 1,
  [CandidateKind.ALIAS]: 2,
  [CandidateKind.TABLE]: 3,
  [CandidateKind.STAR]: 4,
  [CandidateKind.KEYWORD]: 5,
  [CandidateKind.CLAUSE]: 6,
  [CandidateKind.DIRECTION]: 7,
  [CandidateKind.OPERATOR]: 8,
  [CandidateKind.LITERAL]: 9,
};

// ─── Ranking Engine ───────────────────────────────────────────────

export class RankingEngine {
  /**
   * Score and rank candidates for the given context.
   * Returns a new sorted array (does not mutate input).
   */
  rank(
    candidates: CompletionCandidate[],
    context: CompletionContextResult,
    expectedType?: ColumnType | null
  ): CompletionCandidate[] {
    const prefix = context.currentPrefix.toLowerCase();

    // Score each candidate
    const scored = candidates.map(candidate => {
      const syntaxScore = this.computeSyntaxScore(candidate, context);
      const semanticScore = candidate.semanticScore; // Already set by generator
      const typeScore = this.computeTypeScore(candidate, expectedType ?? null, context);
      const contextScore = this.computeContextScore(candidate, context);
      const prefixScore = this.computePrefixScore(candidate, prefix);

      const finalScore =
        SYNTAX_WEIGHT * syntaxScore +
        SEMANTIC_WEIGHT * semanticScore +
        TYPE_WEIGHT * typeScore +
        CONTEXT_WEIGHT * contextScore +
        PREFIX_WEIGHT * prefixScore;

      const explanation = this.buildExplanation(
        candidate, syntaxScore, semanticScore, typeScore, contextScore, prefixScore, finalScore, context
      );

      return {
        ...candidate,
        syntaxScore,
        semanticScore,
        typeScore,
        contextScore,
        prefixScore,
        finalScore: Math.round(finalScore * 1000) / 1000,
        explanation,
      };
    });

    // Filter out candidates with zero prefix match when prefix is present
    const filtered = prefix
      ? scored.filter(c => c.prefixScore > 0)
      : scored;

    // Sort by final score descending, then apply tie-breaking
    filtered.sort((a, b) => {
      // Primary: final score (descending)
      if (Math.abs(b.finalScore - a.finalScore) > 0.001) {
        return b.finalScore - a.finalScore;
      }

      // Tie-break 1: exact prefix match
      const aExact = a.label.toLowerCase() === prefix ? 1 : 0;
      const bExact = b.label.toLowerCase() === prefix ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // Tie-break 2: semantic validity
      if (Math.abs(b.semanticScore - a.semanticScore) > 0.001) {
        return b.semanticScore - a.semanticScore;
      }

      // Tie-break 3: candidate kind priority
      const aPriority = KIND_PRIORITY[a.kind] ?? 99;
      const bPriority = KIND_PRIORITY[b.kind] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Tie-break 4: alphabetical
      return a.label.localeCompare(b.label);
    });

    return filtered;
  }

  // ─── Syntax Score ────────────────────────────────────────────

  private computeSyntaxScore(candidate: CompletionCandidate, context: CompletionContextResult): number {
    const state = context.parserState;

    // If candidate is a keyword and it's in the expected keywords list
    if (candidate.kind === CandidateKind.KEYWORD || candidate.kind === CandidateKind.CLAUSE || candidate.kind === CandidateKind.DIRECTION) {
      if (context.expectedKeywords.includes(candidate.label)) {
        return 1.0;
      }
      return 0.5;
    }

    // Tables expected in FROM/JOIN
    if (candidate.kind === CandidateKind.TABLE) {
      if (state === ParserState.FROM_TABLE || state === ParserState.JOIN_TABLE) {
        return 1.0;
      }
      return 0.25;
    }

    // Columns expected in most expression positions
    if (candidate.kind === CandidateKind.COLUMN) {
      const columnStates = [
        ParserState.SELECT_LIST, ParserState.AFTER_SELECT,
        ParserState.WHERE_START, ParserState.WHERE_OPERAND,
        ParserState.WHERE_RIGHT_OPERAND,
        ParserState.JOIN_CONDITION,
        ParserState.GROUP_BY_START, ParserState.GROUP_BY_COLUMN,
        ParserState.ORDER_BY_START, ParserState.ORDER_BY_COLUMN,
        ParserState.HAVING_START, ParserState.HAVING_CONDITION,
        ParserState.DOT_ACCESS,
      ];
      if (columnStates.includes(state)) {
        return 1.0;
      }
      return 0.25;
    }

    // Star
    if (candidate.kind === CandidateKind.STAR) {
      if (state === ParserState.SELECT_LIST || state === ParserState.AFTER_SELECT) {
        return 1.0;
      }
      return 0.0;
    }

    // Operators
    if (candidate.kind === CandidateKind.OPERATOR) {
      if (state === ParserState.WHERE_OPERATOR || state === ParserState.JOIN_CONDITION || state === ParserState.HAVING_CONDITION) {
        return 1.0;
      }
      return 0.0;
    }

    // Aliases
    if (candidate.kind === CandidateKind.ALIAS) {
      const aliasStates = [
        ParserState.SELECT_LIST, ParserState.AFTER_SELECT,
        ParserState.WHERE_START, ParserState.WHERE_OPERAND,
        ParserState.WHERE_RIGHT_OPERAND,
        ParserState.JOIN_CONDITION,
        ParserState.GROUP_BY_START, ParserState.GROUP_BY_COLUMN,
        ParserState.ORDER_BY_START, ParserState.ORDER_BY_COLUMN,
        ParserState.HAVING_START, ParserState.HAVING_CONDITION,
      ];
      if (aliasStates.includes(state)) {
        return 1.0;
      }
      return 0.25;
    }

    return candidate.syntaxScore;
  }

  // ─── Type Score ──────────────────────────────────────────────

  private computeTypeScore(
    candidate: CompletionCandidate,
    expectedType: ColumnType | null,
    context: CompletionContextResult
  ): number {
    if (!expectedType) return 0.5; // No type expectation

    // Extract candidate's type from detail string
    const candidateType = this.extractTypeFromDetail(candidate.detail);
    if (!candidateType) return 0.5;

    // Check compatibility
    if (expectedType === ColumnType.INT || expectedType === ColumnType.FLOAT) {
      if (isNumericType(candidateType)) return 1.0;
      if (isTextType(candidateType)) return 0.0;
      return 0.25;
    }

    if (expectedType === ColumnType.TEXT) {
      if (isTextType(candidateType)) return 1.0;
      if (isNumericType(candidateType)) return 0.0;
      return 0.25;
    }

    if (expectedType === ColumnType.BOOLEAN) {
      if (isBooleanType(candidateType)) return 1.0;
      return 0.25;
    }

    return 0.5;
  }

  private extractTypeFromDetail(detail: string): ColumnType | null {
    const typeMatch = detail.match(/^(INT|FLOAT|TEXT|BOOLEAN|NULL|UNKNOWN)/);
    if (typeMatch) {
      return typeMatch[1] as ColumnType;
    }
    return null;
  }

  // ─── Context Score ───────────────────────────────────────────

  private computeContextScore(candidate: CompletionCandidate, context: CompletionContextResult): number {
    const clause = context.activeClause;

    // In ORDER BY, prefer columns
    if (clause === ActiveClause.ORDER_BY && candidate.kind === CandidateKind.COLUMN) {
      return 1.0;
    }

    // In FROM/JOIN, prefer tables
    if ((clause === ActiveClause.FROM || clause === ActiveClause.JOIN) && candidate.kind === CandidateKind.TABLE) {
      return 1.0;
    }

    // In WHERE/HAVING, prefer columns
    if ((clause === ActiveClause.WHERE || clause === ActiveClause.HAVING) && candidate.kind === CandidateKind.COLUMN) {
      return 0.95;
    }

    // In SELECT, prefer columns and star
    if (clause === ActiveClause.SELECT && (candidate.kind === CandidateKind.COLUMN || candidate.kind === CandidateKind.STAR)) {
      return 0.95;
    }

    // In ON condition, prefer columns
    if (clause === ActiveClause.ON && candidate.kind === CandidateKind.COLUMN) {
      return 1.0;
    }

    // DOT_ACCESS — columns are highly relevant
    if (context.parserState === ParserState.DOT_ACCESS && candidate.kind === CandidateKind.COLUMN) {
      return 1.0;
    }

    return candidate.contextScore;
  }

  // ─── Prefix Score ────────────────────────────────────────────

  private computePrefixScore(candidate: CompletionCandidate, prefix: string): number {
    if (!prefix) return 1.0; // No prefix = everything matches

    const label = candidate.label.toLowerCase();

    // Exact match
    if (label === prefix) return 1.0;

    // Starts with prefix
    if (label.startsWith(prefix)) return 0.9;

    // Contains prefix
    if (label.includes(prefix)) return 0.5;

    // No match
    return 0.0;
  }

  // ─── Explanation ─────────────────────────────────────────────

  private buildExplanation(
    candidate: CompletionCandidate,
    syntaxScore: number,
    semanticScore: number,
    typeScore: number,
    contextScore: number,
    prefixScore: number,
    finalScore: number,
    context: CompletionContextResult
  ): string {
    const lines: string[] = [];

    lines.push(`Syntax:    ${syntaxScore.toFixed(2)}`);
    lines.push(`Semantic:  ${semanticScore.toFixed(2)}`);
    lines.push(`Type:      ${typeScore.toFixed(2)}`);
    lines.push(`Context:   ${contextScore.toFixed(2)}`);
    lines.push(`Prefix:    ${prefixScore.toFixed(2)}`);
    lines.push(`Final:     ${finalScore.toFixed(3)}`);
    lines.push('');
    lines.push('Why:');

    // Syntax reason
    if (syntaxScore >= 0.9) {
      lines.push(`- Valid ${candidate.kind.toLowerCase()} in ${context.parserState} state`);
    } else if (syntaxScore > 0) {
      lines.push(`- Partially valid in current parser state`);
    }

    // Semantic reason
    if (candidate.kind === CandidateKind.COLUMN) {
      if (semanticScore >= 0.9) {
        lines.push(`- Column resolves cleanly via schema`);
      }
    } else if (candidate.kind === CandidateKind.TABLE) {
      if (semanticScore >= 0.9) {
        lines.push(`- Table exists in schema catalog`);
      }
    } else if (candidate.kind === CandidateKind.ALIAS) {
      if (semanticScore >= 0.9) {
        lines.push(`- Alias resolves to known table`);
      }
    }

    // Type reason
    if (typeScore >= 0.9) {
      lines.push(`- Type compatible with expected context`);
    } else if (typeScore <= 0.1) {
      lines.push(`- Type incompatible with expected context`);
    }

    // Context reason
    if (contextScore >= 0.9) {
      lines.push(`- Relevant in ${context.activeClause} clause`);
    }

    // Prefix reason
    if (context.currentPrefix) {
      if (prefixScore >= 0.9) {
        lines.push(`- Starts with typed prefix '${context.currentPrefix}'`);
      } else if (prefixScore >= 0.5) {
        lines.push(`- Contains typed prefix '${context.currentPrefix}'`);
      }
    }

    return lines.join('\n');
  }
}

// ─── Default Instance ─────────────────────────────────────────────

export const rankingEngine = new RankingEngine();
