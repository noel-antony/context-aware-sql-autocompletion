/**
 * Candidate Ranking Panel Component
 *
 * Detailed score breakdown and explanation for a selected
 * completion candidate. Shows individual score bars and
 * the textual explanation of why the candidate was ranked.
 */

import React from 'react';
import { CompletionCandidate } from '../compiler/completion/candidateTypes';

interface CandidateRankingPanelProps {
  candidate: CompletionCandidate | null;
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return 'var(--text-success)';
  if (score >= 0.4) return 'var(--text-warning)';
  return 'var(--text-danger)';
}

export const CandidateRankingPanel: React.FC<CandidateRankingPanelProps> = ({ candidate }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          Ranking Detail
        </span>
      </div>
      <div className="panel-body">
        {candidate ? (
          <div className="ranking-detail">
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-accent)' }}>
                {candidate.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                {candidate.kind}
              </span>
            </div>

            <div className="ranking-scores">
              {[
                { label: 'Syntax', score: candidate.syntaxScore },
                { label: 'Semantic', score: candidate.semanticScore },
                { label: 'Type', score: candidate.typeScore },
                { label: 'Context', score: candidate.contextScore },
                { label: 'Prefix', score: candidate.prefixScore },
                { label: 'Final', score: candidate.finalScore },
              ].map(({ label, score }) => (
                <React.Fragment key={label}>
                  <span className="ranking-score-label">{label}</span>
                  <div className="ranking-score-bar">
                    <div
                      className="ranking-score-fill"
                      style={{
                        width: `${score * 100}%`,
                        background: label === 'Final' ? 'var(--text-accent)' : getScoreColor(score),
                      }}
                    />
                  </div>
                  <span className="ranking-score-value">{score.toFixed(2)}</span>
                </React.Fragment>
              ))}
            </div>

            <div className="ranking-explanation">{candidate.explanation}</div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="icon">📊</span>
            <span>Click a candidate to see ranking detail</span>
          </div>
        )}
      </div>
    </div>
  );
};
