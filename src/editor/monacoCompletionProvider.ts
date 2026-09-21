/**
 * Monaco Completion Provider
 *
 * Connects the compiler pipeline to Monaco Editor's completion system.
 * Monaco is used purely as a UI/editor host — all completion intelligence
 * comes from our custom compiler pipeline.
 */

import type * as monacoTypes from 'monaco-editor';
import { getCompletions, PipelineResult } from '../compiler/pipeline';
import { CandidateKind } from '../compiler/completion/candidateTypes';
import { SchemaCatalog } from '../schema/schemaCatalog';

// ─── Map our candidate kinds to Monaco completion item kinds ──────

function mapKindToMonaco(
  kind: CandidateKind,
  monaco: typeof monacoTypes
): monacoTypes.languages.CompletionItemKind {
  switch (kind) {
    case CandidateKind.KEYWORD:
    case CandidateKind.CLAUSE:
      return monaco.languages.CompletionItemKind.Keyword;
    case CandidateKind.TABLE:
      return monaco.languages.CompletionItemKind.Struct;
    case CandidateKind.ALIAS:
      return monaco.languages.CompletionItemKind.Variable;
    case CandidateKind.COLUMN:
      return monaco.languages.CompletionItemKind.Field;
    case CandidateKind.OPERATOR:
      return monaco.languages.CompletionItemKind.Operator;
    case CandidateKind.LITERAL:
      return monaco.languages.CompletionItemKind.Value;
    case CandidateKind.DIRECTION:
      return monaco.languages.CompletionItemKind.Enum;
    case CandidateKind.STAR:
      return monaco.languages.CompletionItemKind.Constant;
    default:
      return monaco.languages.CompletionItemKind.Text;
  }
}

// ─── Result Cache ─────────────────────────────────────────────────

let lastResult: PipelineResult | null = null;

export function getLastPipelineResult(): PipelineResult | null {
  return lastResult;
}

// ─── Create Completion Provider ──────────────────────────────────

export function createCompletionProvider(
  monaco: typeof monacoTypes,
  catalog: SchemaCatalog,
  onPipelineResult?: (result: PipelineResult) => void
): monacoTypes.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', ' ', ','],

    provideCompletionItems(
      model: monacoTypes.editor.ITextModel,
      position: monacoTypes.Position
    ): monacoTypes.languages.ProviderResult<monacoTypes.languages.CompletionList> {
      const sql = model.getValue();
      const cursorOffset = model.getOffsetAt(position);

      // Run the full compiler pipeline
      const result = getCompletions(sql, cursorOffset, catalog);
      lastResult = result;

      // Notify listeners
      if (onPipelineResult) {
        onPipelineResult(result);
      }

      // Determine the replacement range
      const word = model.getWordUntilPosition(position);
      const range: monacoTypes.IRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      // Map candidates to Monaco completion items
      const suggestions: monacoTypes.languages.CompletionItem[] = result.candidates.map(
        (candidate, index) => ({
          label: {
            label: candidate.label,
            detail: ` ${candidate.detail}`,
            description: `Score: ${candidate.finalScore.toFixed(3)}`,
          },
          kind: mapKindToMonaco(candidate.kind, monaco),
          insertText: candidate.insertText,
          range,
          sortText: String(index).padStart(5, '0'),
          detail: candidate.detail,
          documentation: {
            value: '```\n' + candidate.explanation + '\n```',
          },
        })
      );

      return { suggestions };
    },
  };
}
