// Load environment variables from .env file
require('dotenv').config();

// Ensure we have required environment variables for testing
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. OpenAI tests will be skipped.');
}

// Set shorter timeout for tests by default (can be overridden in specific tests)
jest.setTimeout(15000); // 15 seconds 