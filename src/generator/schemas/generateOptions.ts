import { z } from "zod";

/**
 * Generation options schema — parameters used for the generate() method
 */
export const generateOptionsSchema: z.ZodObject<
  {
    /** Number of records to generate (default: 10) */
    count: z.ZodDefault<z.ZodNumber>;
    /** Override / extend generated values (default: {}) */
    customValues: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    /** Optional prompt override (default: undefined) */
    prompt: z.ZodOptional<z.ZodString>;
    /** Concurrent batches (default: 1) */
    concurrency: z.ZodDefault<z.ZodNumber>;
    /** Records per batch (default: 10) */
    batchSize: z.ZodDefault<z.ZodNumber>;
    /** Where to write output (default: "./output.json") */
    outputPath: z.ZodDefault<z.ZodString>;
    /** File format (default: "json", options: "json" | "csv") */
    format: z.ZodDefault<z.ZodEnum<["json", "csv"]>>;
    /**
     * Fields to check for duplicates
     * (default: false, options: false | string | string[])
     */
    dupeCheck: z.ZodDefault<
      z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString>, z.ZodLiteral<false>]>
    >;
  },
  "strict"
> = z
  .object({
    count: z.number().int().positive().default(10),

    customValues: z.record(z.any()).default({}),

    prompt: z.string().optional(),

    concurrency: z.number().int().positive().default(1),

    batchSize: z.number().int().positive().default(10),

    outputPath: z.string().default("./output.json"),

    format: z.enum(["json", "csv"]).default("json"),

    dupeCheck: z
      .union([z.string(), z.array(z.string()), z.literal(false)])
      .default(false),
  })
  .strict();

/**
 * Options for the generate method with typed custom values
 */
export interface GenerateOptions<
  C extends Record<string, unknown> = Record<string, unknown>
> {
  /** Number of records to generate (default: 10) */
  count?: number;
  /** Override/extend generated values with custom field values (default: {}) */
  customValues?: C;
  /** Optional prompt override (default: undefined) */
  prompt?: string;
  /** Concurrent batches (default: 1) */
  concurrency?: number;
  /** Records per batch (default: 10) */
  batchSize?: number;
  /** Where to write output (default: "./output.json") */
  outputPath?: string;
  /** File format (default: "json", options: "json" | "csv") */
  format?: "json" | "csv";
  /** Fields to check for duplicates (default: false) */
  dupeCheck?: string | string[] | false;
}

export type ParsedGenerateOptions = z.output<typeof generateOptionsSchema>;
