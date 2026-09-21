/**
 * Semantic Diagnostics Panel Component
 *
 * Displays errors and warnings from the semantic analyzer,
 * parser, and lexer with severity icons, messages, and suggestions.
 */

import React from 'react';
import { Diagnostic, DiagnosticSeverity } from '../compiler/diagnostics/diagnostics';

interface SemanticDiagnosticsPanelProps {
  diagnostics: Diagnostic[];
  parseErrors: { message: string; line: number; column: number }[];
  lexerDiagnostics: { message: string; line: number; column: number }[];
}

function severityIcon(severity: DiagnosticSeverity): string {
  switch (severity) {
    case DiagnosticSeverity.ERROR: return '✕';
    case DiagnosticSeverity.WARNING: return '⚠';
    case DiagnosticSeverity.INFO: return 'ℹ';
  }
}

function severityClass(severity: DiagnosticSeverity): string {
  switch (severity) {
    case DiagnosticSeverity.ERROR: return 'error';
    case DiagnosticSeverity.WARNING: return 'warning';
    case DiagnosticSeverity.INFO: return 'info';
  }
}

export const SemanticDiagnosticsPanel: React.FC<SemanticDiagnosticsPanelProps> = ({
  diagnostics,
  parseErrors,
  lexerDiagnostics,
}) => {
  const allDiagnostics = [
    ...diagnostics,
    ...parseErrors.map(e => ({
      severity: DiagnosticSeverity.ERROR,
      message: e.message,
      code: 'PARSE_ERROR' as any,
      span: null,
    })),
    ...lexerDiagnostics.map(d => ({
      severity: DiagnosticSeverity.WARNING,
      message: d.message,
      code: 'LEXER_WARNING' as any,
      span: null,
    })),
  ];

  const errorCount = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.ERROR).length;
  const warnCount = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.WARNING).length;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          Semantic Diagnostics
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {errorCount > 0 && (
            <span className="panel-badge" style={{ color: 'var(--text-danger)' }}>
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="panel-badge" style={{ color: 'var(--text-warning)' }}>
              {warnCount} warn
            </span>
          )}
        </div>
      </div>
      <div className="panel-body">
        {allDiagnostics.length === 0 ? (
          <div className="diagnostic-empty">
            ✓ No diagnostics — query looks good
          </div>
        ) : (
          allDiagnostics.map((diag, index) => (
            <div key={index} className={`diagnostic-item ${severityClass(diag.severity)}`}>
              <span className="diagnostic-icon">{severityIcon(diag.severity)}</span>
              <div>
                <div className="diagnostic-message">{diag.message}</div>
                {'suggestion' in diag && diag.suggestion && (
                  <div className="diagnostic-suggestion">💡 {diag.suggestion}</div>
                )}
                <div className="diagnostic-code">{diag.code}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
