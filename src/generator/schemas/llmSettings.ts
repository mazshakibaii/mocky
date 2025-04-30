import { z } from "zod";

/**
 * LLM settings schema with proper typings
 */
export const llmSettingsSchema: z.ZodObject<
  {
    /** Model to use (default: "gpt-4.1-mini") */
    model: z.ZodDefault<z.ZodString>;
    /** Model temperature (default: 0.9, min: 0, max: 1) */
    temperature: z.ZodDefault<z.ZodNumber>;
    /** Model provider (default: "openai", options: "openai" | "azure") */
    provider: z.ZodDefault<z.ZodEnum<["openai", "azure"]>>;
  },
  "strict"
> = z
  .object({
    model: z.string().default("gpt-4.1-mini"),
    temperature: z.number().min(0).max(1).default(0.9),
    provider: z.enum(["openai", "azure"]).default("openai"),
  })
  .strict();

export type LLMSettings = z.infer<typeof llmSettingsSchema>;
