import Fuse from "fuse.js";
import { type ParsedGenerateOptions } from "../schemas/generateOptions";

/**
 * Check if a record is a duplicate using Fuse.js fuzzy search
 * @param record The record to check
 * @param existingRecords Array of existing records to check against
 * @param dupeCheck Fields to check for duplicates
 * @returns true if record is a duplicate, false otherwise
 */
export function isDuplicate<T extends Record<string, any>>(
  record: T,
  existingRecords: T[],
  dupeCheck: ParsedGenerateOptions["dupeCheck"]
): boolean {
  if (dupeCheck === false || existingRecords.length === 0) {
    return false;
  }

  const dupeCheckFields = Array.isArray(dupeCheck) ? dupeCheck : [dupeCheck];

  // Fuse.js only works with string fields
  // Extract only the string fields from the record for the search
  const searchObject: Record<string, string> = {};

  for (const field of dupeCheckFields) {
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
    threshold: 0.3, // Lower threshold means stricter matching
    keys: Object.keys(searchObject),
  };

  const fuse = new Fuse(existingRecords, fuseOptions);
  const results = fuse.search(searchObject);

  // If there's a match with high confidence (low score), consider it a duplicate
  return (
    results.length > 0 &&
    results[0].score !== undefined &&
    results[0].score < 0.3
  );
}

/**
 * Filter out duplicates from a batch
 * @param batch The batch of new records to filter
 * @param existingRecords Existing records to check against
 * @param dupeCheck Fields to check for duplicates
 * @returns Array of non-duplicate records
 */
export function filterDuplicates<T extends Record<string, any>>(
  batch: T[],
  existingRecords: T[],
  dupeCheck: ParsedGenerateOptions["dupeCheck"]
): T[] {
  if (dupeCheck === false || existingRecords.length === 0) {
    return batch;
  }

  return batch.filter(
    (record) => !isDuplicate(record, existingRecords, dupeCheck)
  );
}
