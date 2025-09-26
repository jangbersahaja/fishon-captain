// Delta computation logic for charter draft states
// Enables efficient partial updates by computing semantic differences

export interface DraftDelta {
  changed: Record<string, unknown>;
  removed: string[];
  meta: { changedTopLevel: string[] };
  unchanged: string[];
}

/**
 * Compute the semantic difference between two charter draft states.
 * 
 * Comparison semantics:
 * - Scalars: strict equality, normalize '' vs undefined vs null as "empty"
 * - Numbers: treat NaN equal to NaN
 * - Arrays of primitives: shallow compare (length + each element)
 * - Arrays of objects: compare by id field if present, otherwise deep compare
 * - Objects: flatten only top-level diff
 * - Dates/ISO strings: treat equal if same string
 * - Empty/blank values are normalized for comparison
 */
export function computeDraftDelta(
  previous: Record<string, unknown> = {},
  next: Record<string, unknown> = {}
): DraftDelta {
  const changed: Record<string, unknown> = {};
  const removed: string[] = [];
  const unchanged: string[] = [];
  
  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(previous),
    ...Object.keys(next)
  ]);
  
  for (const key of allKeys) {
    const prevValue = previous[key];
    const nextValue = next[key];
    
    if (valuesAreEqual(prevValue, nextValue)) {
      unchanged.push(key);
    } else {
      // Check if this is a removal (had value, now empty/undefined)
      if (!isEmpty(prevValue) && isEmpty(nextValue)) {
        removed.push(key);
      } else {
        changed[key] = nextValue;
      }
    }
  }
  
  return {
    changed,
    removed,
    meta: { changedTopLevel: Object.keys(changed) },
    unchanged
  };
}

/**
 * Deep equality check with charter form semantics
 */
function valuesAreEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined/empty string normalization
  if (isEmpty(a) && isEmpty(b)) return true;
  if (isEmpty(a) || isEmpty(b)) return false;
  
  // NaN equality
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  
  // Primitive comparison
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  
  // Null check (both are objects at this point)
  if (a === null || b === null) {
    return a === b;
  }
  
  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    return arraysAreEqual(a, b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  
  // Object comparison (shallow for now)
  return shallowObjectsAreEqual(a, b);
}

/**
 * Check if value is considered "empty" in charter form context
 */
function isEmpty(value: unknown): boolean {
  return value === null || 
         value === undefined || 
         value === '' ||
         (Array.isArray(value) && value.length === 0);
}

/**
 * Compare arrays with charter form semantics
 */
function arraysAreEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  
  // For arrays of objects, try to compare by id field first
  if (a.length > 0 && typeof a[0] === 'object' && a[0] !== null) {
    return arrayOfObjectsAreEqual(a, b);
  }
  
  // For primitive arrays, compare each element
  return a.every((item, index) => valuesAreEqual(item, b[index]));
}

/**
 * Compare arrays of objects, preferring stable ID comparison
 */
function arrayOfObjectsAreEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  
  // Check if objects have id fields for stable comparison
  const aHasIds = a.every(item => item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id !== 'undefined');
  const bHasIds = b.every(item => item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id !== 'undefined');
  
  if (aHasIds && bHasIds) {
    // Compare by ID sets and individual object equality
    const aIds = new Set(a.map(item => (item as { id: unknown }).id));
    const bIds = new Set(b.map(item => (item as { id: unknown }).id));
    
    if (aIds.size !== bIds.size) return false;
    if (![...aIds].every(id => bIds.has(id))) return false;
    
    // IDs match, now compare objects by ID
    const aById = new Map(a.map(item => [(item as { id: unknown }).id, item]));
    const bById = new Map(b.map(item => [(item as { id: unknown }).id, item]));
    
    return [...aIds].every(id => 
      shallowObjectsAreEqual(aById.get(id), bById.get(id))
    );
  }
  
  // Fallback to positional comparison
  return a.every((item, index) => 
    shallowObjectsAreEqual(item, b[index])
  );
}

/**
 * Shallow object comparison
 */
function shallowObjectsAreEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every(key => 
    bKeys.includes(key) && valuesAreEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}
