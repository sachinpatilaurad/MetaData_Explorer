const OpenAI = require('openai');

// Configure the OpenAI client to point to OpenRouter
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Parses a user query to determine the data source and keywords.
 */
async function parseQueryForApi(query) {
  const modelToUse = "google/gemini-flash-1.5";

  // --- THIS IS THE UPDATED, SMARTER PROMPT ---
  const prompt = `
    You are an intelligent API routing assistant. Your task is to analyze a user's query to determine the correct data source and to extract concise, effective search keywords.

    RULES FOR CHOOSING A SOURCE:
    - If the query is about machine learning, AI, models, NLP, vision, audio, or explicitly mentions "HuggingFace", the source is "HuggingFace".
    - If the query explicitly mentions "Kaggle", the source is "Kaggle".
    - For general government, city, public data, or civic topics (e.g., "new york", "census", "covid data", "crime rates"), the source is "CKAN".

    RULES FOR EXTRACTING KEYWORDS:
    - Extract ONLY the core subject of the query.
    - Be concise. Use 2-4 words maximum.
    - DO NOT include filler words like "datasets", "find", "show me", or the name of the source (e.g., "kaggle").

    User Query: "${query}"

    Your response MUST be ONLY a single, minified JSON object with two keys: "source" and "keywords".
    
    Example 1: for "kaggle data on climate change" -> {"source":"Kaggle","keywords":"climate change"}
    Example 2: for "new york covid data" -> {"source":"CKAN","keywords":"new york covid"}
    Example 3: for "machine learning datasets for text classification" -> {"source":"HuggingFace","keywords":"text classification"}
    Example 4: for "Show me audio datasets on HuggingFace" -> {"source":"HuggingFace","keywords":"audio"}
  `;
  // --- END OF UPDATED PROMPT ---

  // The rest of the function remains the same...
  try {
    const response = await openrouter.chat.completions.create({
      model: modelToUse,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const textResponse = response.choices[0].message.content;

    const jsonMatch = textResponse.match(/\{.*\}/s);
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    } else {
      console.error("AI response did not contain a valid JSON object. Response:", textResponse);
      return { source: null, keywords: null };
    }
  } catch (error) {
    console.error(`Error communicating with OpenRouter or parsing JSON: ${error.message}`);
    throw new Error('Failed to parse query with AI.');
  }
}

module.exports = { parseQueryForApi };