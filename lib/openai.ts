import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an embedding vector for the given text using OpenAI's API
 * @param text The text to generate an embedding for
 * @returns number[] - Array of floats representing the embedding vector
 * Note: When storing in Supabase/PostgreSQL, this array needs to be converted 
 * to a string in the format '[n1,n2,...]' for pgvector compatibility
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
} 