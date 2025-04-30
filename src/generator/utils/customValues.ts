/**
 * Apply custom values to a record
 * @param record The record to apply custom values to
 * @param customValues Custom values to apply
 * @returns The record with custom values applied
 */
export function applyCustomValues<T extends Record<string, any>>(
  record: T,
  customValues: Record<string, any>
): T {
  const result = { ...record };

  // Apply each custom value to the record
  for (const [key, value] of Object.entries(customValues)) {
    // Set the custom value on the record using type-safe assignment
    (result as Record<string, any>)[key] = value;
  }

  return result;
}
