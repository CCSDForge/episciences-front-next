# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application for the Episciences academic journal platform, migrated from React (Vite) and configured for full static rendering with multi-journal support. The application generates static HTML sites for multiple academic journals, with each journal having its own configuration and build output.

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Run development server
npm run dev

# Run linting
npm run lint
```

### Building and Deployment
```bash
# Production build (generates static site)
npm run build

# Build specific journal using Makefile
make <journal-name>  # e.g., make epijinfo

# List available journals
make list

# Serve static build locally for testing
make serve JOURNAL=<journal-name>  # e.g., make serve JOURNAL=epijinfo
make serve JOURNAL=<journal-name> PORT=8080  # custom port
```

### Article Generation
```bash
# Build specific article only (for content updates)
npm run build:article <article-id>

# Start webhook server for remote article rebuilding
npm run webhook
```

## Multi-Journal Architecture

The application supports multiple academic journals through a sophisticated configuration system:

### Journal Configuration Structure
- **Environment Files**: Each journal has its own `.env.local.<journal-code>` file in `external-assets/`
- **Journal Registry**: `external-assets/journals.txt` lists all available journal codes
- **Logo Assets**: Journal-specific logos in `external-assets/logos/` following naming pattern `logo-<journal>-big.svg` and `logo-<journal>-small.svg`
- **Build Output**: Each journal builds to its own directory `dist/<journal-code>/`

### Key Environment Variables
- `NEXT_PUBLIC_JOURNAL_CODE` or `NEXT_PUBLIC_JOURNAL_RVCODE`: Journal identifier
- `NEXT_PUBLIC_API_ROOT_ENDPOINT`: API endpoint for journal data
- `NEXT_PUBLIC_STATIC_BUILD`: Controls static build behavior
- `NEXT_PUBLIC_DISABLE_CLIENT_NAVIGATION`: Disables client-side routing for better SEO

## Static Build System

The application uses Next.js static export (`output: 'export'`) with custom optimizations:

### Static Build Features
- **Full Static Generation**: All pages pre-rendered at build time
- **Journal-Specific Builds**: Each journal gets its own complete static site
- **SEO Optimization**: Proper HTML files for each route, no client-side routing
- **Asset Management**: Automatic copying of public assets, icons, fonts, and locales

### Static Build Utilities (`src/utils/static-build.ts`)
- `isStaticBuild`: Detects if running in static build context
- `getJournalCode()`: Safely retrieves journal code during build
- `safeFetch()`: Wraps API calls to return static data during build, real data at runtime

## Core Architecture Patterns

### App Router Structure
- **Route Organization**: Pages in `src/app/` using Next.js 15 App Router
- **Client Components**: Page logic split into `*Client.tsx` components for client-side functionality
- **Static Data**: Server components fetch data at build time for static generation

### Component Architecture
- **Reusable Components**: In `src/components/` organized by type (Cards, Modals, Sidebars, etc.)
- **Custom Link Component**: `src/components/Link/Link.tsx` - custom implementation that uses standard anchor tags for SEO instead of Next.js Link
- **Image Handling**: Direct string paths (e.g., `'/icons/caret-up-red.svg'`) instead of imports for static build compatibility

### State Management
- **Redux Toolkit**: For global state management (`src/hooks/store`)
- **i18next**: For internationalization with language detection
- **Client-Only Rendering**: Critical for components requiring browser APIs

### Data Services
- **API Layer**: Service files in `src/services/` for each domain (articles, authors, volumes, etc.)
- **Type Safety**: TypeScript interfaces in `src/types/` for all data structures
- **Static Data Strategy**: Services handle both real API calls and static build mocking

## Development Guidelines

### Static Build Considerations
- Use direct string paths for assets instead of ES6 imports (e.g., `const icon = '/icons/icon.svg'` not `import icon from '/icons/icon.svg'`)
- Filter out Next.js-specific props (prefetch, scroll, replace, shallow) when using standard HTML elements
- Always provide fallbacks for environment variables: `process.env.NEXT_PUBLIC_JOURNAL_CODE || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || ''`
- Test builds with `make serve JOURNAL=<journal>` to verify static site functionality

### Image and Asset Handling
- Remove explicit width/height attributes from images when CSS handles sizing
- Use the custom Link component (`src/components/Link/Link.tsx`) for all internal navigation
- Place static assets in `public/` and reference with absolute paths starting with `/`

### Multi-Journal Development
- Test changes across multiple journals using different environment configurations
- Use the Makefile for journal-specific builds and testing
- Verify that journal-specific assets (logos, colors) are properly isolated

### Performance and SEO
- The application prioritizes SEO with full static HTML generation
- Client-side JavaScript is minimal and progressive enhancement only
- Each page has proper meta tags and static content for search engines

## Testing Static Builds

When making changes that affect the static build:

1. Build the application: `npm run build`
2. Serve locally: `make serve JOURNAL=epijinfo`
3. Test navigation, images, and functionality
4. Verify HTML content is properly generated in `dist/<journal>/`
5. Check that all routes serve complete HTML (not just JavaScript)

The static build system is designed for maximum SEO compatibility and fast loading times on static hosting platforms.