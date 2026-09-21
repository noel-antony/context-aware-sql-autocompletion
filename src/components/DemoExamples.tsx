/**
 * Demo Examples
 *
 * Curated demo queries with descriptions, loaded via buttons.
 * Each demo demonstrates a specific compiler-driven completion scenario.
 */

export interface DemoExample {
  id: string;
  label: string;
  description: string;
  sql: string;
  cursorAtEnd: boolean;
}

export const demoExamples: DemoExample[] = [
  {
    id: 'select-completion',
    label: 'SELECT ▸',
    description: 'Columns and * should be suggested',
    sql: 'SELECT ',
    cursorAtEnd: true,
  },
  {
    id: 'table-completion',
    label: 'FROM ▸',
    description: 'Table names should be suggested',
    sql: 'SELECT name FROM ',
    cursorAtEnd: true,
  },
  {
    id: 'alias-column',
    label: 's. column',
    description: 'Alias-aware column completion for Student',
    sql: 'SELECT s.\nFROM Student s',
    cursorAtEnd: false,
  },
  {
    id: 'where-completion',
    label: 'WHERE ▸',
    description: 'Column/operator choices after WHERE',
    sql: 'SELECT s.name\nFROM Student s\nWHERE ',
    cursorAtEnd: true,
  },
  {
    id: 'type-aware',
    label: 'Type-aware',
    description: 'cgpa is FLOAT — numeric-compatible candidates ranked higher',
    sql: 'SELECT s.name\nFROM Student s\nWHERE s.cgpa > ',
    cursorAtEnd: true,
  },
  {
    id: 'join-s-dot',
    label: 'JOIN s.',
    description: 'Only Student columns offered for alias s',
    sql: 'SELECT s.name\nFROM Student s\nJOIN Department d ON s.',
    cursorAtEnd: true,
  },
  {
    id: 'join-d-dot',
    label: 'JOIN d.',
    description: 'Only Department columns offered for alias d',
    sql: 'SELECT s.name\nFROM Student s\nJOIN Department d ON d.',
    cursorAtEnd: true,
  },
  {
    id: 'group-by',
    label: 'GROUP BY',
    description: 'Column candidates for GROUP BY',
    sql: 'SELECT s.department_id\nFROM Student s\nGROUP BY ',
    cursorAtEnd: true,
  },
  {
    id: 'order-by',
    label: 'ORDER BY',
    description: 'Visible columns plus ASC/DESC',
    sql: 'SELECT s.name\nFROM Student s\nORDER BY ',
    cursorAtEnd: true,
  },
  {
    id: 'semantic-error',
    label: '❌ Unknown col',
    description: 'Semantic error: s.nonexistent',
    sql: 'SELECT s.nonexistent\nFROM Student s',
    cursorAtEnd: true,
  },
  {
    id: 'ambiguous-column',
    label: '⚠ Ambiguous',
    description: 'Ambiguous unqualified column: id',
    sql: 'SELECT id\nFROM Student s\nJOIN Department d ON s.department_id = d.id',
    cursorAtEnd: true,
  },
  {
    id: 'type-mismatch',
    label: '❌ Type error',
    description: 'Type mismatch: FLOAT > TEXT',
    sql: "SELECT s.name\nFROM Student s\nWHERE s.cgpa > 'hello'",
    cursorAtEnd: true,
  },
];

import React from 'react';

interface DemoExamplesProps {
  onLoadDemo: (example: DemoExample) => void;
  activeDemo: string | null;
}

export const DemoExamples: React.FC<DemoExamplesProps> = ({ onLoadDemo, activeDemo }) => {
  return (
    <div className="demo-bar">
      <span className="demo-label">Demos:</span>
      {demoExamples.map(demo => (
        <button
          key={demo.id}
          className={`demo-btn ${activeDemo === demo.id ? 'active' : ''}`}
          onClick={() => onLoadDemo(demo)}
          title={demo.description}
        >
          {demo.label}
        </button>
      ))}
    </div>
  );
};
