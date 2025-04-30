import { z, ZodSchema, type ZodTypeAny } from "zod";
import { llmSettingsSchema } from "./llmSettings";

export const mockyOptionsSchema: z.ZodObject<
  {
    /** Zod schema used for validation and typing (required) */
    schema: z.ZodEffects<z.ZodAny, ZodTypeAny, any>;
    /**
     * LLM Settings (default:
     * {
     *   model: "gpt-4.1-mini",
     *   temperature: 0.9,
     *   provider: "openai"
     * })
     */
    llm: z.ZodDefault<
      z.ZodObject<
        {
          model: z.ZodDefault<z.ZodString>;
          temperature: z.ZodDefault<z.ZodNumber>;
          provider: z.ZodDefault<z.ZodEnum<["openai", "azure"]>>;
        },
        "strict"
      >
    >;
  },
  "strict"
> = z
  .object({
    schema: z
      .any()
      .refine((val): val is ZodTypeAny => val instanceof ZodSchema, {
        message: "Must be a valid Zod schema",
      }),

    llm: llmSettingsSchema.default({
      model: "gpt-4.1-mini",
      temperature: 0.9,
      provider: "openai",
    }),
  })
  .strict();

export type MockyOptions = z.input<typeof mockyOptionsSchema>;
export type ParsedOptions = z.output<typeof mockyOptionsSchema>;

/** Utility if you need to reuse just the parsing */
export const parseMockyOptions = (o: MockyOptions): ParsedOptions =>
  mockyOptionsSchema.parse(o);
