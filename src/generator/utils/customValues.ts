/**
 * Apply custom values to a record
 * @param record The record to apply custom values to
 * @param customValues Custom values to apply (can include static values or functions that return values)
 * @returns The record with custom values applied
 */
export function applyCustomValues<
  T extends Record<string, any>,
  C extends Record<string, unknown | ((record: T) => unknown)>
>(record: T, customValues: C): T & Omit<C, keyof { [K in keyof C as C[K] extends Function ? K : never]: any }> {
  // Create a result object that will have both T and C properties
  const result = { ...record } as T & any;

  // Apply each custom value to the record
  for (const [key, value] of Object.entries(customValues)) {
    // If the value is a function, call it with the record to get the dynamic value
    if (typeof value === 'function') {
      (result as any)[key] = (value as (record: T) => unknown)(record);
    } else {
      // Otherwise just set the static value
      (result as any)[key] = value;
    }
  }

  return result;
}
