/**
 * Schema Panel Component
 *
 * Displays the active database schema: tables, columns, types,
 * primary keys, and foreign key relationships.
 */

import React from 'react';
import { SchemaCatalog } from '../schema/schemaCatalog';

interface SchemaPanelProps {
  catalog: SchemaCatalog;
  onSchemaChange: (name: string) => void;
}

export const SchemaPanel: React.FC<SchemaPanelProps> = ({ catalog, onSchemaChange }) => {
  const schema = catalog.getActiveSchema();
  const schemaNames = catalog.getSchemaNames();

  return (
    <div className="panel schema-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          Schema Catalog
        </span>
        <div className="schema-selector">
          <select
            value={schema.name}
            onChange={(e) => onSchemaChange(e.target.value)}
          >
            {schemaNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="panel-body">
        {schema.tables.map(table => (
          <div key={table.name} className="schema-table">
            <div className="schema-table-name">
              <span className="table-icon">⊞</span>
              {table.name}
              <span className="panel-badge">{table.columns.length}</span>
            </div>
            {table.columns.map(col => {
              const fk = table.foreignKeys.find(f => f.column === col.name);
              return (
                <div key={col.name} className="schema-column">
                  <span className="schema-column-name">{col.name}</span>
                  <span className="schema-column-type">{col.type}</span>
                  {col.isPrimaryKey && <span className="schema-column-pk">PK</span>}
                  {fk && <span className="schema-column-fk">FK→{fk.refTable}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
