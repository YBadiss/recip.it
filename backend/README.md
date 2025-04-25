# Recip.it

A web application to save and organize recipes from across the web in a single location with a common format.

## Features

- Save recipes from web links
- Automatic extraction of recipe details (title, ingredients, materials, steps)
- Convert recipes to a standardized markdown format
- Automatic tagging/keyword generation for search
- Search through saved recipes

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Database: SQLite
- Recipe Extraction: OpenAI API, Cheerio for web scraping

## API Endpoints

- `GET /recipes` - Get all recipes with optional search query
- `GET /recipes/:id` - Get a specific recipe by ID
- `POST /recipes` - Create a new recipe by providing a URL
- `POST /recipes/:id/import` - Re-import a recipe from its original URL

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/recip.it.git
cd recip.it
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DB_PATH=./data/recipes.db
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_secret_key_here  # Required for authentication
```

4. Run the database migrations:
```
npm run migrate
```

5. Start the development server:
```
npm run dev
```

The API will be available at http://localhost:3000

### Building for Production

```
npm run build
npm start
```

## Usage Examples

### Saving a Recipe

```bash
curl -X POST http://localhost:3000/recipes \
  -H "Content-Type: application/json" \
  -d '{"link": "https://example.com/some-recipe"}'
```

### Searching Recipes

```bash
curl "http://localhost:3000/recipes?search=pasta"
```

## Future Enhancements

- Frontend web interface
- User authentication
- Recipe collections/categories
- Image support
- Meal planning features

## Logging

The application uses a centralized logging system that follows these key rules:

1. **No Direct Console Usage**: All logging must go through the `Logger` utility. Direct usage of `console.log`, `console.error`, etc. is forbidden.

2. **JSON Output Format**: Logs are formatted as JSON to facilitate log parsing and analysis.

### Using the Logger

To use the logger in your code:

```typescript
import { Logger } from './utils/logger';

// Create a context-specific logger
const logger = Logger.forContext('YourComponentName');

// Log at different levels
logger.info('This is an info message', { additionalData: 'value' });
logger.error('An error occurred', { error });
logger.warn('Warning message');
logger.debug('Debug information', { details: '...' });
```

### Log Levels

The application supports the following log levels, in order of decreasing severity:
- `error`: Critical issues that need immediate attention
- `warn`: Important events that might cause issues but aren't critical failures
- `info`: Normal operational information (default level)
- `debug`: Detailed information useful for debugging

The active log level can be configured via the `LOG_LEVEL` environment variable.

## License

This project is licensed under the ISC License.
