import { z, type ZodTypeAny } from "zod";
import { spinner, log, note, intro, outro } from "@clack/prompts";
import * as cliProgress from "cli-progress";
import chalk from "chalk";
import { saveOutput } from "../lib/saveOutput";
import { generateBatch } from "./utils/batchGenerator";
import { filterDuplicates, isDuplicate } from "./utils/duplicateUtils";
import { applyCustomValues } from "./utils/customValues";
import {
  mockyOptionsSchema,
  type MockyOptions,
  type ParsedOptions,
  parseMockyOptions,
} from "./schemas/mockyOptions";
import {
  type GenerateOptions,
  type ParsedGenerateOptions,
  generateOptionsSchema,
} from "./schemas/generateOptions";

// ──────────────────────────────────────────
// Main class
// ──────────────────────────────────────────

export class Mocky<S extends ZodTypeAny = ZodTypeAny> {
  private readonly opts: ParsedOptions;
  private generatedData: z.infer<S>[] = [];

  private constructor(options: MockyOptions) {
    this.opts = mockyOptionsSchema.parse(options);
  }

  /** Factory so users write `Mocky.create({ … })` */
  public static create<T extends ZodTypeAny>(
    options: MockyOptions & { schema: T }
  ): Mocky<T> {
    return new Mocky<T>(options);
  }

  /** Read‑only access to parsed options */
  public get options(): Readonly<ParsedOptions> {
    return this.opts;
  }

  /**
   * Generate mock data
   * @param options Generation options
   * @param options.count Number of records to generate (default: 10)
   * @param options.customValues Override/extend generated values (default: {})
   * @param options.prompt Optional prompt override (default: undefined)
   * @param options.concurrency Concurrent batches (default: 1)
   * @param options.batchSize Records per batch (default: 10)
   * @param options.outputPath Where to write output (default: "./output.json")
   * @param options.format File format (default: "json")
   * @param options.dupeCheck Fields to check for duplicates (default: false)
   * @returns Object containing generated data, usage information, and duplicates information
   */
  public async generate<
    C extends Record<string, unknown> = Record<string, never>
  >(
    options: GenerateOptions<C, z.infer<S>> = {}
  ): Promise<{
    data: (z.infer<S> & C)[];
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number | null;
      totalTime: number;
      avgTimePerRecord: number;
    };
    duplicates: Record<string, string[]>;
  }> {
    const generateOpts = generateOptionsSchema.parse(options);
    const {
      format,
      concurrency,
      outputPath,
      count,
      customValues,
      batchSize,
      duplicates,
      dupeCheck,
    } = generateOpts;

    // For backward compatibility, if dupeCheck is provided but duplicates is not customized
    // create a duplicates object from dupeCheck
    const effectiveDuplicateConfig =
      dupeCheck !== undefined
        ? dupeCheck === false
          ? null
          : {
              values: Array.isArray(dupeCheck) ? dupeCheck : [dupeCheck],
            }
        : duplicates;

    // Track start time for timing data
    const startTime = Date.now();

    this.generatedData = [];
    let totalDuplicatesFiltered = 0;
    let totalBatchFailures = 0;

    // Track token usage for cost calculation
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    // Track duplicate values by field
    const duplicatesMap: Record<string, string[]> = {};

    // Extract fields to check from the effective duplicate config
    const fieldsToCheck =
      effectiveDuplicateConfig && "values" in effectiveDuplicateConfig
        ? (effectiveDuplicateConfig as { values: string[] }).values
        : [];

    // Initialize duplicate tracking for each field
    fieldsToCheck.forEach((field) => {
      duplicatesMap[field] = [];
    });

    // Show custom values if provided
    const customValueKeys = Object.keys(customValues);

    console.log(" ");
    intro("Generating mock data...");

    note(
      `Number of records: ${count}
Concurrency:        ${concurrency}
Output path:        ${outputPath}
File format:        ${format}
LLM Provider:       ${this.opts.llm.provider}
Model:              ${this.opts.llm.model}

Custom values:      ${customValueKeys.length > 0 ? "Yes" : "N/A"}
Duplicate check:    ${
        effectiveDuplicateConfig && "values" in effectiveDuplicateConfig
          ? fieldsToCheck.join(", ")
          : "N/A"
      }`,
      "Configuration"
    );

    console.log(chalk.gray("│"));

    // Initialize the cli-progress bar with an enhanced format that includes batch info and duplicates
    const progressBar = new cliProgress.SingleBar(
      {
        format: `${chalk.green(
          "◇"
        )}  Generating... {bar} {percentage}% | {value}/{total} Generated | Dupes: {dupes} | Failures: {failures} | ETA: {eta_formatted}`,
        hideCursor: true,
        stopOnComplete: true,
        clearOnComplete: true,
      },
      cliProgress.Presets.shades_grey
    );

    // Start the progress bar with initial values
    progressBar.start(count, 0, {
      batch: "0",
      dupes: "0",
      failures: "0",
    });

    // Keep generating batches until we have enough unique data
    let batchCount = 0;
    let currentTemperature = this.opts.llm.temperature;

    while (this.generatedData.length < count) {
      batchCount++;
      const remainingCount = count - this.generatedData.length;
      const batchesToGenerate = Math.min(
        concurrency,
        Math.ceil(remainingCount / batchSize)
      );

      // Generate multiple batches in parallel based on concurrency
      const batchPromises: Promise<{
        data: z.infer<S>[];
        promptTokens: number;
        completionTokens: number;
      }>[] = [];

      for (let i = 0; i < batchesToGenerate; i++) {
        batchPromises.push(
          generateBatch(this.opts, this.opts.schema as S, generateOpts)
        );
      }

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);

      // Extract data and token usage from batch results
      const batches = batchResults.map((result) => result.data);

      // Accumulate token usage
      for (const result of batchResults) {
        totalPromptTokens += result.promptTokens;
        totalCompletionTokens += result.completionTokens;
      }

      // Count failed batches (empty arrays returned from generateBatch error handler)
      const failedBatchesInRound = batches.filter(
        (batch) => batch.length === 0
      ).length;
      totalBatchFailures += failedBatchesInRound;

      // If all batches in this round failed, adjust temperature to improve chances of success
      if (failedBatchesInRound === batches.length && currentTemperature < 1) {
        currentTemperature = Math.min(1, currentTemperature + 0.1);
        progressBar.stop();
        log.warn(
          `All batches failed due to type mismatches. Increasing temperature to ${currentTemperature.toFixed(
            2
          )} to improve generation`
        );
        progressBar.start(count, this.generatedData.length, {
          batch: `${batchCount}`,
          dupes: `${totalDuplicatesFiltered}`,
          failures: `${totalBatchFailures}`,
        });
      }

      // Calculate total records generated in this batch
      const totalBatchRecords = batches.reduce(
        (sum, batch) => sum + batch.length,
        0
      );

      // Process duplicates and track them
      let newRecords: z.infer<S>[] = [];
      for (const batch of batches) {
        // Capture duplicates before filtering
        if (effectiveDuplicateConfig && "values" in effectiveDuplicateConfig) {
          batch.forEach((record) => {
            fieldsToCheck.forEach((field) => {
              if (
                field in record &&
                typeof record[field as keyof typeof record] === "string" &&
                isDuplicate(record, this.generatedData, field)
              ) {
                const value = record[field as keyof typeof record] as string;
                if (!duplicatesMap[field].includes(value)) {
                  duplicatesMap[field].push(value);
                }
              }
            });
          });
        }

        const uniqueRecords = filterDuplicates(
          batch,
          this.generatedData,
          effectiveDuplicateConfig
        );
        newRecords = [...newRecords, ...uniqueRecords];
      }

      // Calculate duplicates filtered in this batch
      const batchDuplicatesFiltered = totalBatchRecords - newRecords.length;
      totalDuplicatesFiltered += batchDuplicatesFiltered;

      // Add new records to the generated data
      this.generatedData = [...this.generatedData, ...newRecords];

      // Ensure we don't exceed the requested count
      if (this.generatedData.length > count) {
        this.generatedData = this.generatedData.slice(0, count);
      }

      // Update the progress bar with new values including batch number, duplicates filtered, and batch failures
      progressBar.update(Math.min(this.generatedData.length, count), {
        batch: `${batchCount}`,
        dupes: `${totalDuplicatesFiltered}`,
        failures: `${totalBatchFailures}`,
      });

      // If we're not making progress (all generated records are duplicates),
      // increase temperature slightly to encourage diversity
      if (
        newRecords.length === 0 &&
        failedBatchesInRound === 0 && // Only consider duplicate issues if batches didn't fail
        this.generatedData.length < count &&
        currentTemperature < 1
      ) {
        currentTemperature = Math.min(1, currentTemperature + 0.1);
        progressBar.stop();
        log.warn(
          `Increasing temperature to ${currentTemperature.toFixed(
            2
          )} to generate more diverse data`
        );
        progressBar.start(count, this.generatedData.length, {
          batch: `${batchCount}`,
          dupes: `${totalDuplicatesFiltered}`,
          failures: `${totalBatchFailures}`,
        });
      }
    }

    // Stop the progress bar
    progressBar.stop();

    // Apply custom values to all records
    if (customValueKeys.length > 0) {
      const customValuesSpinner = spinner();
      customValuesSpinner.start(`Applying custom values to all records`);
      this.generatedData = this.generatedData.map((record) =>
        applyCustomValues(record, customValues)
      );
      customValuesSpinner.stop(`Custom values applied to ${count} records`);
    }

    // Save the generated data
    await saveOutput(outputPath, this.generatedData, format);

    // Calculate timing data
    const endTime = Date.now();
    const totalSeconds = (endTime - startTime) / 1000;
    const avgSecondsPerRecord = totalSeconds / count;

    // Import cost calculation function
    const { calculateTotalCost } = await import("../lib/costHelper");

    // Calculate estimated cost
    const totalCost = calculateTotalCost(
      this.opts.llm.model,
      totalPromptTokens,
      totalCompletionTokens
    );

    // Format values for display
    const formattedTotalTime =
      totalSeconds > 60
        ? `${(totalSeconds / 60).toFixed(2)} minutes`
        : `${totalSeconds.toFixed(2)} seconds`;
    const formattedAvgTime = `${avgSecondsPerRecord.toFixed(2)} seconds`;
    const formattedTotalCost =
      totalCost !== null
        ? `$${totalCost.toFixed(
            4
          )} USD (est. - does not include cache discounts)`
        : "N/A - model not supported for cost calculation";

    if (totalBatchFailures > 0) {
      log.warn(
        `${totalBatchFailures} batch generation failures occurred due to type mismatches or API errors.`
      );
    }

    // Display generation summary
    note(
      `Total time:          ${formattedTotalTime}
Avg time per record: ${formattedAvgTime}
Total tokens:        ${(
        totalPromptTokens + totalCompletionTokens
      ).toLocaleString()} (${totalPromptTokens.toLocaleString()} prompt, ${totalCompletionTokens.toLocaleString()} completion)
Total cost:          ${formattedTotalCost}

Generated:           ${count} records
Duplicates filtered: ${totalDuplicatesFiltered} records
Batch failures:      ${totalBatchFailures} records`,
      "Run Stats"
    );

    outro(
      `Successfully saved ${count} records to ${outputPath} in ${format} format`
    );

    // Return an object containing the generated data, usage info, and duplicates
    return {
      data: this.generatedData,
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        estimatedCost: totalCost,
        totalTime: totalSeconds,
        avgTimePerRecord: avgSecondsPerRecord,
      },
      duplicates: duplicatesMap,
    };
  }
}

/**
 * Create a new Mocky instance with the given options
 * @param options Configuration options for Mocky
 * @returns A new Mocky instance
 */
export function createMocky<T extends ZodTypeAny>(
  options: MockyOptions & { schema: T }
): Mocky<T> {
  return Mocky.create(options);
}

// Re-export types and schemas for easy access
export * from "./schemas/llmSettings";
export * from "./schemas/mockyOptions";
export * from "./schemas/generateOptions";
