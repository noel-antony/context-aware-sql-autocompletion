import { describe, it } from 'vitest';
import { analyzePrefixSQL } from '../../src/compiler/parser/prefixParser';
import { runPipeline } from '../../src/compiler/pipeline';
import { SchemaCatalog } from '../../src/schema/schemaCatalog';

describe('debug', () => {
  it('dot access debug', () => {
    const sql = 'SELECT s.\nFROM Student s';
    const cursor = 9;
    console.log('SQL:', JSON.stringify(sql));
    console.log('Cursor at:', cursor, 'char:', JSON.stringify(sql.substring(cursor - 2, cursor + 1)));

    const ctx = analyzePrefixSQL(sql, cursor);
    console.log('Parser state:', ctx.parserState);
    console.log('Dot qualifier:', ctx.dotQualifier);
    console.log('Aliases:', ctx.activeAliases);
    console.log('Tables:', ctx.activeTables);
    console.log('Prefix:', JSON.stringify(ctx.currentPrefix));

    const catalog = new SchemaCatalog();
    const result = runPipeline(sql, cursor, catalog);
    console.log('Full-scan aliases:', result.context.activeAliases);
    console.log('Full-scan tables:', result.context.activeTables);
    console.log('Symbol table refs:', result.symbolTable.getReferenceNames());
    console.log('Candidates:', result.candidates.length);
    result.candidates.forEach(c => console.log(' ', c.label, c.kind, c.finalScore));
  });
});
