import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export class Config {
  static get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  static get IS_PRODUCTION(): boolean {
    return this.NODE_ENV === 'production';
  }

  static get DOMAIN(): string | undefined {
    return process.env.DOMAIN || undefined;
  }

  static get PORT(): number {
    return Number(process.env.PORT) || 3000;
  }

  static get CORS_ORIGIN(): string | string[] {
    const origin = process.env.CORS_ORIGIN;
    if (!origin) return '*';
    return origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin;
  }

  static get DATA_FOLDER(): string {
    return process.env.DATA_FOLDER || path.join(__dirname, '../data');
  }

  static get DB_PATH(): string {
    return `${this.DATA_FOLDER}/recipes.db`;
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

  static get SUPADATA_API_KEY(): string {
    const key = process.env.SUPADATA_API_KEY;
    if (!key) {
      console.warn('SUPADATA_API_KEY is not set in environment variables');
    }
    return key || '';
  }

  static get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn('JWT_SECRET is not set in environment variables');
    }
    return secret || 'default-jwt-secret-key-for-development-only';
  }

  static get JWT_EXPIRATION(): string {
    return process.env.JWT_EXPIRATION || '24h';
  }

  static get COOKIE_NAME(): string {
    return process.env.COOKIE_NAME || 'recipeit_token';
  }

  static get RECIPE_URL_PREFIX(): string {
    return process.env.RECIPE_URL_PREFIX || 'http://localhost:3000/recipes';
  }

  static get IMGUR_CLIENT_ID(): string {
    const clientId = process.env.IMGUR_CLIENT_ID;
    if (!clientId) {
      console.warn('IMGUR_CLIENT_ID is not set in environment variables');
    }
    return clientId || '';
  }
}
