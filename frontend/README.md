# SignVerse Frontend

A modern React/Next.js frontend application for the SignVerse sign language translation platform.

## Features

- **Modern UI/UX**: Built with Next.js 15, TypeScript, and TailwindCSS
- **Authentication**: Complete login/register system with JWT tokens
- **Responsive Design**: Mobile-first approach with beautiful components
- **Component Library**: Reusable UI components using Radix UI primitives
- **Type Safety**: Full TypeScript support throughout the application

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React Context API
- **HTTP Client**: Fetch API with custom service layer

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Authentication components
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── layout/           # Layout components
│   │   └── header.tsx
│   └── ui/               # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── contexts/             # React contexts
│   └── auth-context.tsx  # Authentication context
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
│   └── utils.ts          # Common utilities
├── services/             # API services
│   └── api.ts            # API client
└── types/                # TypeScript type definitions
    └── auth.ts           # Authentication types
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on port 5001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Authentication

The app includes a complete authentication system:

- **Login**: Username/password authentication
- **Register**: New user registration
- **JWT Tokens**: Secure token-based authentication
- **Protected Routes**: Automatic route protection
- **User Context**: Global user state management

### Default Admin User

- **Username**: `admin`
- **Password**: `admin`

## API Integration

The frontend communicates with the SignVerse backend API:

- **Base URL**: `http://localhost:5001/api/v1`
- **Authentication**: JWT Bearer tokens
- **Endpoints**: 
  - `POST /auth/login` - User login
  - `POST /auth/register` - User registration
  - `GET /health` - Health check

## Styling

The app uses TailwindCSS with a custom design system:

- **Colors**: Semantic color tokens for consistency
- **Components**: Reusable component variants
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Built-in dark mode support

## Development

### Adding New Components

1. Create component in appropriate directory
2. Use TypeScript interfaces for props
3. Follow naming conventions (PascalCase)
4. Export from index files for clean imports

### API Integration

1. Add new endpoints to `src/services/api.ts`
2. Define TypeScript types in `src/types/`
3. Use the `apiService` for HTTP requests
4. Handle errors appropriately

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Write meaningful commit messages
4. Test your changes thoroughly

## License

This project is part of the SignVerse platform.