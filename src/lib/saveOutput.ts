import * as fs from 'fs';
import * as path from 'path';

/**
 * Saves an array of objects to a file in either JSON or CSV format
 * @param outputPath - The path where the file should be saved
 * @param data - The array of objects to save
 * @param format - The format to save the data in ('json' or 'csv')
 * @returns A Promise that resolves when the file has been saved
 */
export async function saveOutput<T extends Record<string, any>>(
  outputPath: string,
  data: T[],
  format: 'json' | 'csv'
): Promise<void> {
  // Check if file extension matches the format
  const expectedExtension = `.${format}`;
  const actualExtension = path.extname(outputPath).toLowerCase();
  
  if (actualExtension !== expectedExtension) {
    throw new Error(`File extension mismatch: Format is '${format}' but file extension is '${actualExtension}'. Expected '${expectedExtension}'.`);
  }
  
  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  await fs.promises.mkdir(dir, { recursive: true });
  
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
  } else if (format === 'csv') {
    // If data is empty, return an empty CSV
    if (data.length === 0) {
      content = '';
    } else {
      // Extract headers from the first object
      const headers = Object.keys(data[0]);
      
      // Create CSV header row
      const headerRow = headers.join(',');
      
      // Create CSV data rows
      const dataRows = data.map(item => 
        headers.map(header => {
          // Handle values that might need escaping in CSV
          const value = item[header];
          if (value === null || value === undefined) {
            return '';
          }
          
          const stringValue = String(value);
          
          // If value contains commas, quotes, or newlines, wrap in quotes and escape existing quotes
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          
          return stringValue;
        }).join(',')
      );
      
      // Combine header and data rows
      content = [headerRow, ...dataRows].join('\n');
    }
  } else {
    throw new Error(`Unsupported format: ${format}. Please use 'json' or 'csv'.`);
  }

  // Write the content to the file
  await fs.promises.writeFile(outputPath, content, 'utf8');
}