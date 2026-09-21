/**
 * AST Viewer Component
 *
 * Renders the parsed AST as a collapsible tree structure.
 * Custom lightweight renderer — no heavy visualization library.
 */

import React, { useState } from 'react';
import { ASTNode, QueryNode, ExpressionNode } from '../compiler/ast/nodes';

interface ASTViewerProps {
  ast: QueryNode | null;
}

const ASTNodeView: React.FC<{ node: any; label?: string; depth?: number }> = ({
  node,
  label,
  depth = 0,
}) => {
  const [collapsed, setCollapsed] = useState(depth > 3);

  if (node === null || node === undefined) return null;

  // Handle primitive values
  if (typeof node !== 'object') {
    return (
      <div className="ast-node" style={{ marginLeft: depth * 12 }}>
        {label && <span className="ast-node-type">{label}: </span>}
        <span className="ast-node-value">{String(node)}</span>
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(node)) {
    if (node.length === 0) return null;
    return (
      <div style={{ marginLeft: depth * 12 }}>
        {label && (
          <div
            className="ast-node-label"
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer' }}
          >
            {collapsed ? '▸' : '▾'} {label} [{node.length}]
          </div>
        )}
        {!collapsed &&
          node.map((item, i) => (
            <ASTNodeView key={i} node={item} label={`[${i}]`} depth={depth + 1} />
          ))}
      </div>
    );
  }

  // Handle AST node objects
  const nodeType = node.type || label || 'Node';
  const childKeys = Object.keys(node).filter(
    k => k !== 'type' && k !== 'location'
  );

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        className="ast-node-label"
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer' }}
      >
        {childKeys.length > 0 ? (collapsed ? '▸' : '▾') : '•'}{' '}
        <span className="ast-node-type">{nodeType}</span>
        {node.location && (
          <span className="ast-node-value" style={{ marginLeft: 6, fontSize: 10 }}>
            L{node.location.line}:{node.location.column}
          </span>
        )}
      </div>
      {!collapsed &&
        childKeys.map(key => {
          const value = node[key];
          if (value === null || value === undefined) return null;

          if (typeof value === 'object' && !Array.isArray(value) && value.type) {
            return <ASTNodeView key={key} node={value} label={key} depth={depth + 1} />;
          }

          if (Array.isArray(value)) {
            return <ASTNodeView key={key} node={value} label={key} depth={depth + 1} />;
          }

          // Simple value
          if (value === '*') {
            return (
              <div key={key} style={{ marginLeft: (depth + 1) * 12 }}>
                <span className="ast-node-type">{key}: </span>
                <span className="ast-node-value">*</span>
              </div>
            );
          }

          return (
            <div key={key} style={{ marginLeft: (depth + 1) * 12 }}>
              <span className="ast-node-type">{key}: </span>
              <span className="ast-node-value">
                {typeof value === 'boolean' ? String(value) : value}
              </span>
            </div>
          );
        })}
    </div>
  );
};

export const ASTViewer: React.FC<ASTViewerProps> = ({ ast }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          AST Viewer
        </span>
      </div>
      <div className="panel-body">
        {ast ? (
          <div className="ast-tree">
            <ASTNodeView node={ast} label="Query" depth={0} />
          </div>
        ) : (
          <div className="ast-empty">
            No AST available — query may be incomplete
          </div>
        )}
      </div>
    </div>
  );
};
