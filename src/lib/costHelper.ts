type ModelCostData = {
  prompt: number;
  completion: number;
};

type ModelCostMap = {
  [key: string]: ModelCostData;
};

export const modelCost: ModelCostMap = {
  "gpt-4.1": {
    prompt: 2.0,
    completion: 8.0,
  },
  "gpt-4.1-mini": {
    prompt: 0.4,
    completion: 1.6,
  },
  "gpt-4.1-nano": {
    prompt: 0.1,
    completion: 0.4,
  },
};

/**
 * Calculates the total cost of using a specified model based on the number of prompt and completion tokens.
 * @param {string} model - The name of the model to calculate the cost for.
 * @param {number} promptTokens - The number of prompt tokens used.
 * @param {number} completionTokens - The number of completion tokens used.
 * @returns {number | null} The total cost calculated for the given tokens and model, or null if the model is not supported.
 */
export const calculateTotalCost = (
  model: string,
  promptTokens: number,
  completionTokens: number
): number | null => {
  const modelCostData = modelCost[model];
  if (!modelCostData) {
    return null;
  }

  // Costs are per 1 million tokens, so divide tokens by 1,000,000
  const promptCost = (promptTokens / 1000000) * modelCostData.prompt;
  const completionCost =
    (completionTokens / 1000000) * modelCostData.completion;

  const totalCost = promptCost + completionCost;
  return totalCost;
};
