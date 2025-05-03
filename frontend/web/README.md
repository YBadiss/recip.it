# Recip.it Frontend

A modern, responsive frontend for the Recip.it recipe collection application.

## Features

- Modern UI with responsive design
- Recipe cards with images
- Proper organization of components
- Integrated linting and formatting
- TypeScript for type safety

## Tech Stack

- React
- TypeScript
- React Router
- React Bootstrap
- Bootstrap Icons
- Vite
- ESLint
- Prettier

## Getting Started

### Prerequisites

- Node.js (v14.x or higher)
- npm (v7.x or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd recip.it/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Or use the setup script:
```bash
./scripts/setup.sh
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Linting and Formatting

Lint the code:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format the code:
```bash
npm run format
```

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React context providers
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── styles/         # CSS styles
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Application entry point
├── .eslintrc.js        # ESLint configuration
├── .prettierrc         # Prettier configuration
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## API Communication

The frontend communicates with the backend API through the API service located in `src/services/api.ts`. The Vite development server is configured to proxy API requests to the backend. 