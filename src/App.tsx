/**
 * App — Main Application Component
 *
 * Assembles all panels into a professional single-page layout
 * exposing the compiler internals alongside the SQL editor.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SQLEditor } from './components/SQLEditor';
import { SchemaPanel } from './components/SchemaPanel';
import { CompletionPanel } from './components/CompletionPanel';
import { ParserStatePanel } from './components/ParserStatePanel';
import { SemanticDiagnosticsPanel } from './components/SemanticDiagnosticsPanel';
import { ASTViewer } from './components/ASTViewer';
import { CandidateRankingPanel } from './components/CandidateRankingPanel';
import { DemoExamples, DemoExample } from './components/DemoExamples';
import { PipelineResult, runPipeline } from './compiler/pipeline';
import { SchemaCatalog } from './schema/schemaCatalog';
import { CompletionCandidate } from './compiler/completion/candidateTypes';
import './styles/index.css';

const INITIAL_SQL = 'SELECT s.name\nFROM Student s\nWHERE s.';

function App() {
  const [catalog] = useState(() => new SchemaCatalog());
  const [sql, setSql] = useState(INITIAL_SQL);
  const [cursorOffset, setCursorOffset] = useState(INITIAL_SQL.length);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Run pipeline on SQL/cursor change
  const updatePipeline = useCallback((newSql: string, offset: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const result = runPipeline(newSql, offset, catalog);
        setPipelineResult(result);
        setSelectedCandidateIndex(null);
      } catch (e) {
        console.error('Pipeline error:', e);
      }
    }, 50);
  }, [catalog]);

  const handleSqlChange = useCallback((newSql: string) => {
    setSql(newSql);
    updatePipeline(newSql, newSql.length);
  }, [updatePipeline]);

  const handleCursorChange = useCallback((offset: number) => {
    setCursorOffset(offset);
    updatePipeline(sql, offset);
  }, [sql, updatePipeline]);

  const handlePipelineResult = useCallback((result: PipelineResult) => {
    setPipelineResult(result);
    setSelectedCandidateIndex(null);
  }, []);

  const handleSchemaChange = useCallback((name: string) => {
    catalog.setActiveSchema(name);
    updatePipeline(sql, cursorOffset);
  }, [catalog, sql, cursorOffset, updatePipeline]);

  const handleLoadDemo = useCallback((demo: DemoExample) => {
    setSql(demo.sql);
    setActiveDemo(demo.id);
    const offset = demo.cursorAtEnd
      ? demo.sql.length
      : demo.sql.indexOf('.') + 1; // For alias-dot demos, place cursor after dot
    setCursorOffset(offset);

    // Run pipeline immediately
    setTimeout(() => {
      const result = runPipeline(demo.sql, demo.cursorAtEnd ? demo.sql.length : demo.sql.indexOf('\n'), catalog);
      setPipelineResult(result);
      setSelectedCandidateIndex(null);
    }, 100);
  }, [catalog]);

  // Initial pipeline run
  useEffect(() => {
    updatePipeline(INITIAL_SQL, INITIAL_SQL.length);
  }, [updatePipeline]);

  const selectedCandidate: CompletionCandidate | null =
    pipelineResult && selectedCandidateIndex !== null
      ? pipelineResult.candidates[selectedCandidateIndex] ?? null
      : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="icon">⟨/⟩</span>
          Context-Aware SQL Autocompletion
          <span className="subtitle">— Parser-State & Schema-Aware Semantic Analysis</span>
        </h1>
        <div className="header-actions">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Compiler-Driven • Deterministic Ranking • No ML/AI
          </span>
        </div>
      </header>

      <DemoExamples onLoadDemo={handleLoadDemo} activeDemo={activeDemo} />

      <div className="app-content">
        {/* Top Row */}
        <SQLEditor
          value={sql}
          onChange={handleSqlChange}
          onCursorChange={handleCursorChange}
          catalog={catalog}
          onPipelineResult={handlePipelineResult}
        />

        <SchemaPanel catalog={catalog} onSchemaChange={handleSchemaChange} />

        {/* Bottom Row — 4 panels */}
        <div className="bottom-panels">
          <CompletionPanel
            candidates={pipelineResult?.candidates ?? []}
            selectedIndex={selectedCandidateIndex}
            onSelect={setSelectedCandidateIndex}
          />

          <ParserStatePanel context={pipelineResult?.context ?? null} />

          <SemanticDiagnosticsPanel
            diagnostics={pipelineResult?.diagnostics ?? []}
            parseErrors={pipelineResult?.parseErrors ?? []}
            lexerDiagnostics={pipelineResult?.lexerDiagnostics ?? []}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-primary)' }}>
            <ASTViewer ast={pipelineResult?.ast ?? null} />
            <CandidateRankingPanel candidate={selectedCandidate} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
