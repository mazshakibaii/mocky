# Mocky

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered mock data generation with Zod schema validation and duplicate detection

## Overview

Mocky is a versatile mock data generation tool designed to produce customizable and high-quality mock datasets for testing, prototyping, and simulation. Using AI models from OpenAI or Azure, it generates realistic data that matches your schema definitions.

### Key Features

- **Schema-Based Generation** - Define your data structure using Zod schemas
- **AI-Powered** - Creates realistic, contextually aware mock data
- **Duplicate Detection** - Smart filtering to ensure dataset uniqueness
- **Custom Value Overrides** - Apply specific values to generated records
- **Cost Estimation** - Track token usage and estimate API costs
- **Multiple Output Formats** - Export to JSON or CSV
- **Batch Processing** - Generate large datasets with configurable concurrency

## Installation

```bash
# Using npm
npm install mocky

# Using yarn
yarn add mocky

# Using pnpm
pnpm add mocky

# Using bun
bun add mocky
```

## Quick Start

```typescript
import { z } from "zod";
import { createMocky } from "mocky";

// 1. Define your schema with Zod
const userSchema = z.object({
  name: z.string(),
  age: z.number().int().min(18).max(100),
  email: z.string().email(),
});

// 2. Create a Mocky instance with your schema
const mocky = createMocky({
  schema: userSchema,
  llm: {
    model: "gpt-4.1-mini", // Default model
    temperature: 0.9, // Controls randomness (0-1)
    provider: "openai", // "openai" or "azure"
  },
});

// 3. Generate mock data
async function generateUsers() {
  const users = await mocky.generate({
    count: 100, // Number of records to generate
    concurrency: 5, // Number of concurrent batch operations
    batchSize: 20, // Records per batch
    outputPath: "./users.json", // Where to save the output
    format: "json", // "json" or "csv"
    dupeCheck: ["name", "email"], // Fields to check for duplicates
  });

  console.log(`Generated ${users.length} unique user records`);
}

generateUsers().catch(console.error);
```

## Environment Setup

Set your API keys as environment variables in your `.env` file:

```bash
# For OpenAI
OPENAI_API_KEY="your-openai-api-key"

# For Azure OpenAI
AZURE_API_KEY="your-azure-api-key"
AZURE_BASE_URL="your-azure-base_url"
```

## Advanced Usage

### Custom Value Application

> **🟢 TIP**: Use custom values to reduce LLM costs. This is recommended when values are numeric and can be generated programmatically without AI by leveraging libraries such as faker.

Override or extend specific fields in the generated data:

```typescript
import { faker } from "@faker-js/faker"

const users = await mocky.generate({
  count: 50,
  customValues: {
    isActive: true, // Set all records to active
    balance: faker.finance.amount({ min: 0, max: 100_000, dec: 2, symbol: "$" }) // Randomise balance (e.g. "$42,058.72)
    country: "USA", // Add a new field
    createdAt: () => new Date(), // Dynamic value using a function
    roles: (existing) => [...existing, "user"], // Extend existing array values
  },
});
```

### Custom Prompt

Provide additional context to guide the generation process:

```typescript
const employees = await mocky.generate({
  count: 25,
  prompt:
    "Generate employees for a tech startup with realistic job titles and salary ranges",
});
```

### Duplicate Detection

Duplicates are matched via fuzzy search using Fuse.js. This filters duplicates which look similar as well as exact matches.

Control how duplicates are detected and filtered:

```typescript
// Check a single field
const products = await mocky.generate({
  count: 30,
  dupeCheck: "name", // Check product names for duplicates
});

// Check multiple fields
const orders = await mocky.generate({
  count: 100,
  dupeCheck: ["customerId", "productId", "orderDate"], // Composite uniqueness check
});

// Disable duplicate checking (may result in duplicates)
const logs = await mocky.generate({
  count: 500,
  dupeCheck: false,
});
```

## API Reference

### `createMocky<T>(options)`

Creates a new Mocky instance with the given schema and options.

#### Parameters

- `options` - Configuration object with the following properties:
  - `schema` (required) - A Zod schema defining the structure and validation rules for your data
  - `llm` (optional) - LLM settings object with the following properties:
    - `model` (default: `"gpt-4.1-mini"`) - The AI model to use
    - `temperature` (default: `0.9`) - Controls the randomness of the output (0-1)
    - `provider` (default: `"openai"`) - The LLM provider to use (`"openai"` or `"azure"`)

#### Returns

- A `Mocky<T>` instance with the specified schema type.

### `mocky.generate(options)`

Generates mock data according to the schema and options.

#### Parameters

- `options` (optional) - Generation options with the following properties:
  - `count` (default: `10`) - Number of records to generate
  - `customValues` (default: `{}`) - Object with key-value pairs to override or extend generated values
  - `prompt` (optional) - Custom prompt to guide the AI generation
  - `concurrency` (default: `1`) - Number of concurrent batch operations
  - `batchSize` (default: `10`) - Records per batch
  - `outputPath` (default: `"./output.json"`) - Where to save the output
  - `format` (default: `"json"`) - Output format (`"json"` or `"csv"`)
  - `dupeCheck` (default: `false`) - Fields to check for duplicates (`false`, string, or string array)

#### Returns

- A Promise that resolves to an array of the generated records with the type defined by your schema.

## Output Example

For a schema defining users, the output might look like:

```json
[
  {
    "id": "3f8d5e27-4c3b-4a1d-8f9a-6b8d1f2e3c4d",
    "name": "Alice Johnson",
    "age": 34,
    "email": "alice.johnson@example.com",
    "isActive": true,
    "roles": ["admin", "editor"],
    "createdAt": "2023-09-15T10:30:00.000Z"
  },
  {
    "id": "7a1b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p",
    "name": "Bob Smith",
    "age": 28,
    "email": "bob.smith@example.com",
    "isActive": true,
    "roles": ["user", "contributor"],
    "createdAt": "2023-10-02T14:45:00.000Z"
  }
  // Additional records...
]
```

## Common Issues and Solutions

- **Type Mismatches**: If batches are failing due to type mismatches, Mocky automatically increases the temperature to improve generation success. You can also provide a more specific prompt.

- **API Key Issues**: Ensure your API keys are set as environment variables and have sufficient permissions.

- **Low Diversity**: If too many duplicates are filtered, try increasing the temperature parameter in the LLM settings.

## License

MIT License - See LICENSE for details
