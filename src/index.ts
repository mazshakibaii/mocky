import { z } from "zod";
import {
  createMocky,
  type GenerateOptions,
  type MockyOptions,
} from "./generator/Mocky";

const mocky = createMocky({
  schema: z.object({
    name: z.string(),
    age: z.number(),
  }),
});

export { createMocky };
export type { MockyOptions, GenerateOptions };
