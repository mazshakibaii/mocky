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
import { faker } from "@faker-js/faker";

// 1. Define your schema with Zod - a complex product review schema
const productReviewSchema = z.object({
  // Fields we'll generate with Faker (simple pattern-based data)
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  rating: z.number().int().min(1).max(5),
  
  // Fields where LLM adds unique value (complex, contextual data)
  productName: z.string(),
  reviewTitle: z.string(),
  reviewText: z.string().min(50),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  sentimentScore: z.number().min(-1).max(1),
  helpfulCount: z.number().int().min(0),
  replyFromSeller: z.string().optional(),
});

// 2. Create a Mocky instance with your schema
const mocky = createMocky({
  schema: productReviewSchema,
  llm: {
    model: "gpt-4.1-mini", // Default model
    temperature: 0.9, // Controls randomness (0-1)
    provider: "openai", // "openai" or "azure"
  },
});

// 3. Generate mock data
async function generateProductReviews() {
  const reviews = await mocky.generate({
    count: 50, // Number of records to generate
    concurrency: 5, // Number of concurrent batch operations
    batchSize: 10, // Records per batch
    outputPath: "./product-reviews.json", // Where to save the output
    format: "json", // "json" or "csv"
    dupeCheck: ["reviewTitle", "reviewText"], // Fields to check for duplicates
    prompt: "Generate realistic product reviews for consumer electronics like smartphones, laptops, and headphones. Include specific details about features, performance, and user experience.",
    
    // Use custom values for fields better generated without LLM
    customValues: {
      id: () => faker.string.uuid(),
      userId: () => faker.string.uuid(),
      createdAt: () => faker.date.recent({ days: 30 }).toISOString(),
      rating: () => faker.number.int({ min: 1, max: 5 }),
      helpfulCount: () => faker.number.int({ min: 0, max: 500 }),
    },
  });

  console.log(`Generated ${reviews.length} unique product reviews`);
}

generateProductReviews().catch(console.error);
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

> **🟢 TIP**: Use custom values with Faker for simple pattern-based data to reduce LLM costs, while letting the LLM generate complex, contextual content.

Override or extend specific fields in the generated data with static values or functions:

```typescript
import { faker } from "@faker-js/faker";

// For a medical research dataset where patient descriptions require medical expertise
const medicalCaseStudies = await mocky.generate({
  count: 50,
  prompt: "Generate realistic medical case studies for research purposes with detailed patient histories, symptoms, diagnoses, and treatment outcomes",
  customValues: {
    // Simple fields generated with Faker (saves LLM tokens)
    patientId: () => `PT-${faker.string.alphanumeric(8).toUpperCase()}`,
    visitDate: () => faker.date.past({ years: 2 }).toISOString(),
    age: () => faker.number.int({ min: 18, max: 90 }),
    gender: () => faker.person.sex(),
    bloodPressure: () => `${faker.number.int({ min: 90, max: 180 })}/${faker.number.int({ min: 60, max: 120 })}`,
    weight: () => faker.number.float({ min: 45, max: 150, precision: 0.1 }),
    height: () => faker.number.float({ min: 150, max: 200, precision: 0.1 }),
    
    // Dynamic values based on the LLM-generated record
    riskScore: (record) => {
      // Calculate risk score based on conditions and symptoms
      const conditionKeywords = ['diabetes', 'hypertension', 'obesity', 'cancer', 'cardiac'];
      let score = 0;
      
      // Check if diagnoses contain any high-risk conditions
      if (record.diagnosis) {
        conditionKeywords.forEach(keyword => {
          if (record.diagnosis.toLowerCase().includes(keyword)) score += 10;
        });
      }
      
      // Add age factor
      score += Math.floor((record.age || 50) / 10);
      
      return Math.min(Math.max(score, 1), 100); // Range 1-100
    },
    
    // Metadata fields
    lastUpdated: () => new Date().toISOString(),
    attendingPhysician: () => `Dr. ${faker.person.lastName()}`,
    hospitalName: () => faker.helpers.arrayElement([
      'Metro General Hospital',
      'Riverside Medical Center',
      'University Health System',
      'Memorial Hospital',
      'Community Care Clinic'
    ]),
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

For the product review schema demonstrated in the Quick Start, the output might look like:

```json
[
  {
    "id": "3f8d5e27-4c3b-4a1d-8f9a-6b8d1f2e3c4d",
    "userId": "9e8d7c6b-5a4e-3f2d-1g0h-9i8j7k6l5m4n",
    "createdAt": "2025-04-15T14:32:18.721Z",
    "rating": 4,
    "productName": "SoundWave Pro X500 Noise-Cancelling Headphones",
    "reviewTitle": "Impressive Sound Quality but Battery Life Could Be Better",
    "reviewText": "I've been using the SoundWave Pro X500 headphones for about two weeks now, and I'm genuinely impressed with the sound quality. The bass is deep without being overwhelming, and the noise-cancellation feature works exceptionally well during my commute. The ear cushions are comfortable enough for extended wear, though they do get a bit warm after a couple of hours. My biggest complaint is the battery life - despite the advertised 30 hours, I'm only getting about 22 hours on a single charge with ANC enabled.",
    "pros": [
      "Exceptional noise cancellation",
      "Premium sound quality across all frequencies",
      "Comfortable fit for most ear sizes",
      "Quick charging capability (15 min charge = 3 hours playback)"
    ],
    "cons": [
      "Battery life falls short of advertised specs",
      "Ear cushions get warm during extended use",
      "Mobile app occasionally disconnects",
      "Premium price point"
    ],
    "sentimentScore": 0.65,
    "helpfulCount": 247,
    "replyFromSeller": "Thank you for your detailed review! We're sorry to hear about the battery life issue. Our 30-hour claim is based on 50% volume with ANC enabled. We'd love to troubleshoot this with you - please contact our support team at support@soundwave.example."
  },
  {
    "id": "7c6f5d4e-3b2a-1f0e-9d8c-7b6a5d4c3b2a",
    "userId": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    "createdAt": "2025-04-28T09:17:43.129Z",
    "rating": 5,
    "productName": "UltraFast X15 Gaming Laptop",
    "reviewTitle": "Gaming Beast that Exceeded All My Expectations",
    "reviewText": "After researching gaming laptops for months, I finally pulled the trigger on the UltraFast X15 and couldn't be happier. The 240Hz display is buttery smooth with virtually no ghosting, and the RTX 4080 handles everything I throw at it with ease. I've been playing Cyberpunk 2077 and Elden Ring at max settings and maintaining 100+ FPS consistently. The cooling system is remarkable - even during intense gaming sessions, the keyboard remains comfortable to touch. The RGB lighting is customizable and adds a nice aesthetic touch without being too flashy.",
    "pros": [
      "Exceptional gaming performance",
      "Effective cooling system that keeps temperatures manageable",
      "Gorgeous display with high refresh rate and accurate colors",
      "Surprisingly good battery life for everyday tasks",
      "High-quality build materials"
    ],
    "cons": [
      "Fans can get loud under heavy load",
      "Slightly bulky compared to ultrabooks",
      "Premium price point"
    ],
    "sentimentScore": 0.92,
    "helpfulCount": 189
  }
]
```

This example demonstrates how the LLM generates contextually rich and detailed product reviews, while Faker handles the simpler structured data like IDs and timestamps.

## Common Issues and Solutions

- **Type Mismatches**: If batches are failing due to type mismatches, Mocky automatically increases the temperature to improve generation success. You can also provide a more specific prompt.

- **API Key Issues**: Ensure your API keys are set as environment variables and have sufficient permissions.

- **Low Diversity**: If too many duplicates are filtered, try increasing the temperature parameter in the LLM settings.

## License

MIT License - See LICENSE for details
