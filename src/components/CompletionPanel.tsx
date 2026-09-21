/**
 * Completion Panel Component
 *
 * Displays ranked completion candidates with kind icons,
 * scores, and visual score bars. Clicking a candidate
 * shows its detailed ranking explanation.
 */

import React from 'react';
import { CompletionCandidate, CandidateKind } from '../compiler/completion/candidateTypes';

interface CompletionPanelProps {
  candidates: CompletionCandidate[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function kindIcon(kind: CandidateKind): { letter: string; className: string } {
  switch (kind) {
    case CandidateKind.KEYWORD: return { letter: 'K', className: 'keyword' };
    case CandidateKind.TABLE: return { letter: 'T', className: 'table' };
    case CandidateKind.ALIAS: return { letter: 'A', className: 'alias' };
    case CandidateKind.COLUMN: return { letter: 'C', className: 'column' };
    case CandidateKind.OPERATOR: return { letter: 'O', className: 'operator' };
    case CandidateKind.DIRECTION: return { letter: 'D', className: 'direction' };
    case CandidateKind.STAR: return { letter: '✱', className: 'star' };
    case CandidateKind.CLAUSE: return { letter: 'S', className: 'clause' };
    case CandidateKind.LITERAL: return { letter: 'L', className: 'literal' };
    default: return { letter: '?', className: 'keyword' };
  }
}

function scoreClass(score: number): string {
  if (score >= 0.7) return 'score-high';
  if (score >= 0.4) return 'score-medium';
  return 'score-low';
}

export const CompletionPanel: React.FC<CompletionPanelProps> = ({ candidates, selectedIndex, onSelect }) => {
  if (candidates.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="dot"></span>
            Completion Candidates
          </span>
          <span className="panel-badge">0</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <span className="icon">💡</span>
            <span>Type SQL to see suggestions</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          Completion Candidates
        </span>
        <span className="panel-badge">{candidates.length}</span>
      </div>
      <div className="panel-body">
        {candidates.slice(0, 30).map((candidate, index) => {
          const icon = kindIcon(candidate.kind);
          return (
            <div
              key={`${candidate.label}-${index}`}
              className={`completion-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => onSelect(index)}
            >
              <span className="completion-rank">{index + 1}</span>
              <span className={`completion-icon ${icon.className}`}>{icon.letter}</span>
              <div className="completion-content">
                <div className="completion-label">{candidate.label}</div>
                <div className="completion-detail">{candidate.detail}</div>
              </div>
              <div className="completion-score">
                <div>{candidate.finalScore.toFixed(3)}</div>
                <div className="score-bar">
                  <div
                    className={`score-bar-fill ${scoreClass(candidate.finalScore)}`}
                    style={{ width: `${candidate.finalScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
