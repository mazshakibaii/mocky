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
     * Duplicate detection configuration
     * (default: null)
     */
    duplicates: z.ZodDefault<
      z.ZodUnion<
        [
          z.ZodNull,
          z.ZodObject<
            {
              /** Fields to check for duplicates */
              values: z.ZodArray<z.ZodString>;
              /** Fuzzy matching threshold (0-1, lower is stricter) */
              threshold: z.ZodOptional<z.ZodNumber>;
            },
            "strict"
          >
        ]
      >
    >;
    /**
     * @deprecated Use duplicates object instead
     */
    dupeCheck?: z.ZodOptional<
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

    duplicates: z
      .union([
        z.null(),
        z
          .object({
            values: z.array(z.string()),
            threshold: z.number().min(0).max(1).optional(),
          })
          .strict(),
      ])
      .default(null),

    dupeCheck: z
      .union([z.string(), z.array(z.string()), z.literal(false)])
      .optional(),
  })
  .strict();

/**
 * Custom values can be either static values or functions that generate a value
 * for each record using the typed record schema
 */
export type CustomValueOrFunction<T, R> = R | ((record: T) => R);

/**
 * Duplicate detection configuration
 */
export interface DuplicatesConfig {
  /** Fields to check for duplicates */
  values: string[];
  /** Fuzzy matching threshold (0-1, lower is stricter, default: 0.3) */
  threshold?: number;
}

/**
 * Options for the generate method with typed custom values
 */
export interface GenerateOptions<
  C extends Record<string, unknown> = Record<string, unknown>,
  T = any
> {
  /** Number of records to generate (default: 10) */
  count?: number;
  /**
   * Override/extend generated values with custom field values (default: {})
   * Values can be static or functions that generate a value for each record
   * Functions receive the strongly-typed record based on your schema
   */
  customValues?: {
    [K in keyof C]: CustomValueOrFunction<T, C[K]>;
  };
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
  /**
   * Configuration for duplicate detection
   * @example { values: ["name", "email"], threshold: 0.2 }
   */
  duplicates?: DuplicatesConfig | null;
  /**
   * @deprecated Use duplicates object instead
   * Fields to check for duplicates (default: false)
   */
  dupeCheck?: string | string[] | false;
}

export type ParsedGenerateOptions = z.output<typeof generateOptionsSchema>;
