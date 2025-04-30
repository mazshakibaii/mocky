import { generateObject } from "ai";
import { z, type ZodTypeAny } from "zod";
import { createAzure, type AzureOpenAIProvider } from "@ai-sdk/azure";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { type ParsedGenerateOptions } from "../schemas/generateOptions";
import { type ParsedOptions } from "../schemas/mockyOptions";

/**
 * Generate a batch of data
 * @param options Parsed Mocky options
 * @param schema Schema to use for generation
 * @param generateOptions Options for generating the batch
 * @returns Promise with array of generated data and token usage
 */
export async function generateBatch<S extends ZodTypeAny>(
  options: ParsedOptions,
  schema: S,
  generateOptions: ParsedGenerateOptions
): Promise<{
  data: z.infer<S>[];
  promptTokens: number;
  completionTokens: number;
}> {
  const { llm } = options;
  const { prompt, batchSize } = generateOptions;

  let provider: OpenAIProvider | AzureOpenAIProvider;

  // Setup provider
  switch (llm.provider) {
    case "openai":
      provider = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!, // OpenAI API key
      });
      break;
    case "azure":
      provider = createAzure({
        apiKey: process.env.AZURE_API_KEY!, // Azure API key
        baseURL: process.env.AZURE_BASE_URL!,
      });
      break;
    default:
      // This ensures provider is always assigned before use
      provider = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      break;
  }

  try {
    // Generate data
    const { object, usage } = await generateObject({
      schema: z.object({ data: z.array(schema) }),
      model: provider(llm.model),
      temperature: llm.temperature,
      prompt: `${
        prompt ??
        "You are a mock data generator tasked with creating mock datasets for a given context."
      }
      
      RULES:
      - Generate ${batchSize} records for the given schema.
      - Ensure the data is realistic and follows the schema structure.
      - Make sure all records are distinct from each other.`,
    });

    return {
      data: object.data,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    };
  } catch (error) {
    return { data: [], promptTokens: 0, completionTokens: 0 }; // Return empty data with zero tokens on error
  }
}
