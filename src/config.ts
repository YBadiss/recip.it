import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export class Config {
  static get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  static get PORT(): number {
    return Number(process.env.PORT) || 3000;
  }

  static get CORS_ORIGIN(): string | string[] {
    const origin = process.env.CORS_ORIGIN;
    if (!origin) return '*';
    return origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin;
  }

  static get DB_PATH(): string {
    return process.env.DB_PATH || path.join(__dirname, '../data/recipes.db');
  }

  static get LOG_LEVEL(): string {
    return process.env.LOG_LEVEL || 'info';
  }

  static get OPENAI_API_KEY(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn('OPENAI_API_KEY is not set in environment variables');
    }
    return key || '';
  }

  static get OPENAI_MODEL(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o';
  }
} 