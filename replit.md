# Gym Gurus - Fitness Management Platform

## Overview

Gym Gurus is a comprehensive fitness management platform designed specifically for personal trainers to manage their clients, create workout plans, track progress, and grow their business. The application provides an intuitive interface for trainers to streamline their operations, from client onboarding to progress monitoring and communication.

The platform features a modern, responsive design with both light and dark modes, emphasizing accessibility and user experience. It's built as a full-stack application with real-time capabilities for client-trainer interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Library**: Radix UI primitives with shadcn/ui component system for consistent, accessible components
- **Styling**: Tailwind CSS with custom design system including dark/light theme support
- **Animations**: Framer Motion for smooth, performant animations with reduced motion support
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **API Design**: RESTful architecture with `/api` prefix for all backend routes

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Schema Management**: Centralized schema definitions in `shared/schema.ts`
- **Migrations**: Drizzle Kit for database migrations and schema synchronization
- **Connection**: Neon PostgreSQL with connection pooling for scalability

### Design System
- **Typography**: Inter (primary) and Outfit (display) fonts from Google Fonts
- **Color Palette**: Fitness-focused design with energetic green primary colors
- **Component Library**: Custom components built on Radix UI primitives
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Accessibility**: Built-in support for screen readers, keyboard navigation, and reduced motion preferences

### Development Architecture
- **Monorepo Structure**: Client, server, and shared code in single repository
- **Path Aliases**: Configured for clean imports (`@/`, `@shared/`, `@assets/`)
- **Development Server**: Vite dev server with Express API integration
- **Build Process**: Separate client (Vite) and server (esbuild) build pipelines

### Key Features
- **Client Management**: Comprehensive client profiles with progress tracking
- **Workout Planning**: Exercise library with customizable workout creation
- **Progress Tracking**: Visual charts and metrics for client progress monitoring  
- **Communication**: Real-time messaging system between trainers and clients
- **Scheduling**: Calendar integration for session management
- **Dashboard**: Analytics and overview for trainer business insights

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Cloud-native PostgreSQL database with serverless architecture
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Recharts**: Composable charting library for progress visualization
- **Lucide Icons**: Consistent icon set for interface elements
- **Framer Motion**: Animation library for enhanced user interactions

### Development and Build Tools
- **Vite**: Next-generation frontend build tool with hot module replacement
- **TypeScript**: Static type checking for both client and server code
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **ESBuild**: Fast JavaScript bundler for server-side code compilation

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation for forms and API data
- **Hookform Resolvers**: Integration between React Hook Form and Zod validation

### Authentication and Session Management
- **Express Sessions**: Server-side session management
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **Crypto**: Built-in Node.js module for secure ID generation

### Fonts and Assets
- **Google Fonts**: Inter and Outfit font families for typography
- **Generated Assets**: Custom fitness-related images and branding assets

## Functionality Audit (October 26, 2025)

### ✅ Working Features

#### Authentication & Session Management
- **Development Login**: `/api/login` endpoint works, creates session with demo-trainer-123 user
- **Session Management**: Memory-based session storage functioning in development mode  
- **User Authentication Check**: `/api/auth/user` endpoint returns user data from session
- **Logout**: `/api/logout` endpoint redirects to landing page

#### Pages & Navigation
- **Landing Page**: Loads successfully with sign-in options
- **Dashboard**: Displays properly with hero section, stats cards, and quick actions
- **Clients Page**: Shows 2 mock clients (John Smith, Sarah Johnson) with cards
- **Workout Plans Page**: Displays 2 mock workouts (Full Body Strength, Cardio Blast)
- **Exercise Library**: Shows 4 mock exercises with search bar and filter buttons
- **Schedule Page**: Calendar view loads with navigation controls
- **Messages Page**: Basic interface loads (conversation list and message area)
- **Analytics Page**: Page loads but charts may not display data
- **Progress Page**: Page loads with client selector
- **Settings Page**: Page structure loads with profile and business sections

#### API Endpoints (GET Operations)
- **Dashboard Stats**: `/api/dashboard/stats/:trainerId` returns mock statistics
- **Clients List**: `/api/clients` returns 2 mock clients
- **Workouts List**: `/api/workouts` returns 2 mock workouts  
- **Exercises List**: `/api/exercises` returns 4 mock exercises

#### UI/UX Features
- **Responsive Design**: Mobile and desktop layouts properly implemented
- **Sidebar Navigation**: Collapsible sidebar works on desktop, sheet/overlay on mobile
- **Theme Toggle**: Light/dark mode switching functional
- **Form Validation**: Client-side validation with React Hook Form and Zod
- **Loading States**: Skeleton loaders and loading indicators present
- **Error Boundaries**: Error handling prevents app crashes

### ❌ Not Working Features

#### Database Operations
- **Neon PostgreSQL**: Database endpoint disabled, all DB operations fail
- **Data Persistence**: Cannot save any new data (clients, workouts, exercises, sessions)
- **Real Data Fetch**: All data retrieval falls back to mock data

#### CRUD Operations (POST/PUT/DELETE)
- **Create Client**: POST `/api/clients` returns 500 error
- **Create Workout**: POST `/api/workouts` returns 500 error  
- **Create Exercise**: POST `/api/exercises` returns 500 error
- **Create Session**: POST `/api/sessions` returns 500 error
- **Update Operations**: All PUT requests fail with database errors
- **Delete Operations**: All DELETE requests fail with database errors

#### Specific Feature Issues
- **Messages**: GET `/api/messages` returns error - messaging system not functional
- **Progress Tracking**: GET `/api/progress/:clientId` returns 500 error
- **Settings**: GET `/api/settings` returns HTML instead of JSON (routing issue)
- **Analytics Data**: Real analytics data unavailable, only mock data shown
- **WebSocket**: Real-time features not functional (console shows WebSocket errors)
- **File Upload**: Image/file uploads would fail without database storage

#### Form Submissions
- **Add Client Form**: Opens but cannot save new clients
- **Create Workout Form**: Opens, validates, but submission fails
- **Add Exercise Form**: Cannot persist new exercises
- **Schedule Session Form**: Cannot create new sessions
- **Settings Forms**: Cannot update profile or business information

### 🔧 Technical Issues

#### Infrastructure
- **Database**: Neon endpoint disabled - needs to be re-enabled via Neon API
- **Session Store**: Using memory store (data lost on restart) instead of persistent storage
- **WebSocket**: HMR WebSocket errors in console (development-only, not affecting functionality)

#### Development vs Production
- **Authentication**: OIDC auth attempts fail, falls back to development auth
- **Environment**: Running in development mode with NODE_ENV=development
- **Mock Data**: All data operations use hardcoded mock data

### 📝 Recommendations

1. **Enable Neon Database**: Primary issue - re-enable the Neon PostgreSQL endpoint
2. **Implement Fallback Storage**: Add SQLite or file-based storage for development
3. **Error Messaging**: Improve user-facing error messages for failed operations
4. **Offline Mode**: Consider implementing offline-first architecture
5. **Data Export**: Add ability to export data while database is unavailable

### 🎨 UI/UX Observations

- **Responsive Design**: Excellent mobile/tablet/desktop adaptation
- **Visual Design**: Clean, modern interface with good color scheme
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Fast page loads with React.memo and optimizations
- **Animations**: Smooth Framer Motion animations with reduced motion support

### ⚡ Performance Notes

- **Initial Load**: Fast due to Vite bundling and code splitting
- **API Response**: Mock data returns instantly
- **React Query**: Proper caching configuration (60s stale time)
- **Lazy Loading**: Images and components use lazy loading
- **Bundle Size**: Optimized with tree shaking and minification