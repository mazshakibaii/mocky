import Fuse from "fuse.js";
import { type ParsedGenerateOptions } from "../schemas/generateOptions";

/**
 * Check if a record is a duplicate using Fuse.js fuzzy search
 * @param record The record to check
 * @param existingRecords Array of existing records to check against
 * @param duplicateConfig Duplicate detection configuration
 * @returns true if record is a duplicate, false otherwise
 */
export function isDuplicate<T extends Record<string, any>>(
  record: T,
  existingRecords: T[],
  duplicateConfig?:
    | ParsedGenerateOptions["duplicates"]
    | ParsedGenerateOptions["dupeCheck"]
    | null
): boolean {
  // Handle null or undefined case
  if (duplicateConfig === null || duplicateConfig === undefined) {
    return false;
  }

  // Handle the new duplicates object format
  if (
    typeof duplicateConfig === "object" &&
    duplicateConfig !== null &&
    "values" in duplicateConfig
  ) {
    // New format: { values: string[], threshold?: number }
    const fieldsToCheck = (duplicateConfig as { values: string[] }).values;
    const threshold =
      (duplicateConfig as { threshold?: number }).threshold ?? 0.3;

    return checkDuplicateWithFields(
      record,
      existingRecords,
      fieldsToCheck,
      threshold
    );
  }

  // Legacy dupeCheck format (for backward compatibility)
  if (duplicateConfig === false || existingRecords.length === 0) {
    return false;
  }

  const dupeCheckFields = Array.isArray(duplicateConfig)
    ? duplicateConfig
    : [duplicateConfig];
  return checkDuplicateWithFields(
    record,
    existingRecords,
    dupeCheckFields,
    0.3
  ); // Use fixed threshold for legacy format
}

/**
 * Helper function to check for duplicates with specific fields and threshold
 */
function checkDuplicateWithFields<T extends Record<string, any>>(
  record: T,
  existingRecords: T[],
  fields: string[],
  threshold: number
): boolean {
  if (fields.length === 0 || existingRecords.length === 0) {
    return false;
  }

  // Fuse.js only works with string fields
  // Extract only the string fields from the record for the search
  const searchObject: Record<string, string> = {};

  for (const field of fields) {
    // Use in operator to safely check if the field exists
    if (field in record && typeof record[field as keyof T] === "string") {
      searchObject[field] = record[field as keyof T] as string;
    }
  }

  // If we don't have any string fields to check, return false (no duplicates)
  if (Object.keys(searchObject).length === 0) {
    return false;
  }

  // Configure Fuse.js options with only the string fields
  const fuseOptions = {
    includeScore: true,
    threshold: threshold, // Use the provided threshold
    keys: Object.keys(searchObject),
  };

  const fuse = new Fuse(existingRecords, fuseOptions);
  const results = fuse.search(searchObject);

  // If there's a match with high confidence (low score), consider it a duplicate
  return (
    results.length > 0 &&
    results[0].score !== undefined &&
    results[0].score < threshold
  );
}

/**
 * Filter out duplicates from a batch
 * @param batch The batch of new records to filter
 * @param existingRecords Existing records to check against
 * @param duplicateConfig Duplicate detection configuration
 * @returns Array of non-duplicate records
 */
export function filterDuplicates<T extends Record<string, any>>(
  batch: T[],
  existingRecords: T[],
  duplicateConfig?:
    | ParsedGenerateOptions["duplicates"]
    | ParsedGenerateOptions["dupeCheck"]
    | null
): T[] {
  // If no duplicate config or no existing records, return the batch as is
  if (
    duplicateConfig === null ||
    duplicateConfig === undefined ||
    existingRecords.length === 0
  ) {
    return batch;
  }

  // For legacy dupeCheck format (false means no duplicate checking)
  if (duplicateConfig === false) {
    return batch;
  }

  return batch.filter(
    (record) => !isDuplicate(record, existingRecords, duplicateConfig)
  );
}
