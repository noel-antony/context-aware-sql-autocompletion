/**
 * Parser State Panel Component
 *
 * Displays the current parser state, active clause,
 * expected tokens, current prefix, and visible aliases.
 * This panel exposes compiler internals to prove the system
 * is parser-driven rather than a black box.
 */

import React from 'react';
import { CompletionContextResult } from '../compiler/parser/parserState';

interface ParserStatePanelProps {
  context: CompletionContextResult | null;
}

export const ParserStatePanel: React.FC<ParserStatePanelProps> = ({ context }) => {
  if (!context) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="dot"></span>
            Parser State
          </span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <span className="icon">⚙</span>
            <span>No parser state yet</span>
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
          Parser State
        </span>
      </div>
      <div className="panel-body">
        <div className="state-item">
          <div className="state-label">Current State</div>
          <div className="state-value highlight">{context.parserState}</div>
        </div>

        <div className="state-item">
          <div className="state-label">Active Clause</div>
          <div className="state-value">{context.activeClause}</div>
        </div>

        <div className="state-item">
          <div className="state-label">Expected Keywords</div>
          <div className="state-tags">
            {context.expectedKeywords.length > 0 ? (
              context.expectedKeywords.map(kw => (
                <span key={kw} className="state-tag keyword">{kw}</span>
              ))
            ) : (
              <span className="state-tag">none</span>
            )}
          </div>
        </div>

        <div className="state-item">
          <div className="state-label">Expected Token Kinds</div>
          <div className="state-tags">
            {context.expectedTokenKinds.map(kind => (
              <span key={kind} className="state-tag">{kind}</span>
            ))}
          </div>
        </div>

        <div className="state-item">
          <div className="state-label">Current Prefix</div>
          <div className="state-value">
            {context.currentPrefix ? `"${context.currentPrefix}"` : '(empty)'}
          </div>
        </div>

        {context.dotQualifier && (
          <div className="state-item">
            <div className="state-label">Dot Qualifier</div>
            <div className="state-value highlight">{context.dotQualifier}.</div>
          </div>
        )}

        <div className="state-item">
          <div className="state-label">Visible Aliases</div>
          <div className="state-tags">
            {context.activeAliases.length > 0 ? (
              context.activeAliases.map(a => (
                <span key={a.alias} className="state-tag alias">
                  {a.alias} → {a.tableName}
                </span>
              ))
            ) : (
              <span className="state-tag">none</span>
            )}
          </div>
        </div>

        <div className="state-item">
          <div className="state-label">Referenced Tables</div>
          <div className="state-tags">
            {context.activeTables.length > 0 ? (
              context.activeTables.map(t => (
                <span key={t} className="state-tag">{t}</span>
              ))
            ) : (
              <span className="state-tag">none</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
