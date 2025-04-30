/**
 * Apply custom values to a record
 * @param record The record to apply custom values to
 * @param customValues Custom values to apply
 * @returns The record with custom values applied
 */
export function applyCustomValues<
  T extends Record<string, any>,
  C extends Record<string, unknown>
>(record: T, customValues: C): T & C {
  // Create a result object that will have both T and C properties
  const result = { ...record } as T & C;

  // Apply each custom value to the record
  for (const [key, value] of Object.entries(customValues)) {
    // Set the custom value on the result
    (result as any)[key] = value;
  }

  return result;
}
