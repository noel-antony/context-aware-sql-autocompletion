/**
 * Type System
 *
 * Type compatibility rules for SQL semantic analysis.
 * Handles numeric compatibility (INT ↔ FLOAT),
 * string operations, boolean logic, and NULL handling.
 */

import { ColumnType } from '../../schema/schemaTypes';

// ─── Type Categories ───────────────────────────────────────────────

export function isNumericType(type: ColumnType): boolean {
  return type === ColumnType.INT || type === ColumnType.FLOAT;
}

export function isBooleanType(type: ColumnType): boolean {
  return type === ColumnType.BOOLEAN;
}

export function isTextType(type: ColumnType): boolean {
  return type === ColumnType.TEXT;
}

export function isNullType(type: ColumnType): boolean {
  return type === ColumnType.NULL;
}

// ─── Type Compatibility ────────────────────────────────────────────

/**
 * Check if two types are compatible for comparison.
 * Rules:
 * - numeric ↔ numeric: compatible (INT ↔ FLOAT)
 * - text ↔ text: compatible
 * - boolean ↔ boolean: compatible
 * - NULL ↔ anything: compatible (via IS NULL)
 * - UNKNOWN ↔ anything: compatible (lenient)
 * - numeric ↔ text: INCOMPATIBLE
 * - text ↔ boolean: INCOMPATIBLE
 */
export function areTypesCompatible(left: ColumnType, right: ColumnType): boolean {
  // UNKNOWN is always compatible (lenient)
  if (left === ColumnType.UNKNOWN || right === ColumnType.UNKNOWN) return true;

  // NULL is compatible with anything
  if (left === ColumnType.NULL || right === ColumnType.NULL) return true;

  // Same type always compatible
  if (left === right) return true;

  // Numeric compatibility: INT ↔ FLOAT
  if (isNumericType(left) && isNumericType(right)) return true;

  return false;
}

/**
 * Get the result type of a comparison between two types.
 */
export function getComparisonResultType(left: ColumnType, right: ColumnType): ColumnType {
  if (!areTypesCompatible(left, right)) return ColumnType.UNKNOWN;
  return ColumnType.BOOLEAN;
}

/**
 * Check if a type is valid for boolean operations (AND, OR, NOT).
 */
export function isValidBooleanOperand(type: ColumnType): boolean {
  return type === ColumnType.BOOLEAN ||
         type === ColumnType.UNKNOWN ||
         type === ColumnType.NULL;
}

/**
 * Check if a type is valid for LIKE operations (must be TEXT-compatible).
 */
export function isValidLikeOperand(type: ColumnType): boolean {
  return type === ColumnType.TEXT ||
         type === ColumnType.UNKNOWN ||
         type === ColumnType.NULL;
}

/**
 * Get the widest numeric type.
 */
export function widenNumericType(left: ColumnType, right: ColumnType): ColumnType {
  if (left === ColumnType.FLOAT || right === ColumnType.FLOAT) return ColumnType.FLOAT;
  return ColumnType.INT;
}

/**
 * Map literal types to column types.
 */
export function literalTypeToColumnType(literalType: string): ColumnType {
  switch (literalType) {
    case 'integer': return ColumnType.INT;
    case 'decimal': return ColumnType.FLOAT;
    case 'string': return ColumnType.TEXT;
    case 'boolean': return ColumnType.BOOLEAN;
    case 'null': return ColumnType.NULL;
    default: return ColumnType.UNKNOWN;
  }
}
