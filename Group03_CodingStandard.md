# Group03 Coding Standard

## CHAPTER 1. INTRODUCTION

### 1.1. Purpose

The purpose of this document is to define the coding standards for the development of Soundwave, an intelligent music streaming application. These standards aim to ensure consistency, maintainability, readability, and quality across the entire codebase, facilitating collaboration and reducing potential errors. Adherence to these standards is mandatory for all team members contributing to the codebase.

### 1.2. Scope

This document covers coding standards applicable to all aspects of the Soundwave project, including:

*   Backend development (Node.js, Express, TypeScript, Prisma)
*   Frontend development (React, Next.js, TypeScript, Tailwind CSS)
*   API communication patterns
*   Database schema design and interaction (PostgreSQL, Prisma)
*   General practices like naming conventions, formatting, documentation, and error handling.

### 1.3. Intended Audience

Intended Audience	Name	Reading Suggestion
Mentor	Nguyen Thi Thanh	All
Team Member	Ho Pham Tuan Kiet	All
	Lim Duc Hung
	Vong Thien Long
	Vo Ngoc My Duyen
	Nguyen Bao Kim
	Lam Xuan Hoang
Table 1.1. Intended Audience

## CHAPTER 2. BACKEND

### 2.1. Core Technologies

*   **Language:** TypeScript (`strict` mode enabled).
*   **Framework:** Node.js with Express.
*   **ORM:** Prisma.
*   **Database:** PostgreSQL.

### 2.2. Naming Conventions

*   **Files:** kebab-case (`user.service.ts`).
*   **Classes/Interfaces/Enums/Types:** PascalCase (`AuthResponse`, `Role`).
*   **Functions/Methods:** camelCase (`getUserById`).
*   **Variables/Parameters:** camelCase (`userId`, `req`).
*   **Constants:** UPPER_SNAKE_CASE (`JWT_SECRET`).
*   **File Suffixes:** `*.controller.ts`, `*.service.ts`, `*.routes.ts`, `*.middleware.ts`.
*   **Prisma Models:** PascalCase (in `schema.prisma`).
*   **Prisma Fields:** camelCase (in `schema.prisma`).

### 2.3. Structure & Formatting

#### 2.3.1. Folder Structure

Maintain a clear separation of concerns using the established folder structure within `src/`. This ensures logical organization and findability of code.

```
backend/src/
|   index.ts
|
+---config
|       cloudinary.ts
|       db.ts
|       socket.ts
|
+---controllers
|       admin.controller.ts
|       ...
|
+---middleware
|       auth.middleware.ts
|       ...
|
+---routes
|       admin.routes.ts
|       ...
|
+---services
|       admin.service.ts
|       ...
|
+---types
|       express.d.ts
|       ...
|
\---utils
        cloudinary.ts
        handle-utils.ts
        prisma-selects.ts
```
*(Image 2.1: Backend Project Folder Structure)*

#### 2.3.2. Controllers (`src/controllers/`)

*   **Responsibility:** Handle incoming HTTP requests, parse request data (params, query, body), call appropriate service methods, and formulate HTTP responses (data or errors).
*   Keep controllers lean; complex business logic belongs in services.
*   Use dependency injection (typically via constructor or route binding if using a framework like NestJS, though manual service calls are used here) to access services.
*   Perform basic input validation or rely on validation middleware.

*(Image 2.2: Example Controller Function (`getUserById`))*

#### 2.3.3. Services (`src/services/`)

*   **Responsibility:** Contain the core business logic of the application. Interact with the database via Prisma Client, perform data manipulation and validation, integrate with other services (like AI or email), and prepare data for controllers.
*   Services should be reusable and testable independently of controllers.
*   Handle database transactions if multiple operations need to be atomic.

*(Image 2.3: Example Service Function (`getUserById`))*

#### 2.3.4. Routes (`src/routes/`)

*   **Responsibility:** Define API endpoints, specifying the HTTP method (GET, POST, etc.) and path. Map routes to specific controller functions. Apply necessary middleware (authentication, authorization, validation, file upload) to routes or groups of routes.

*(Image 2.4: Example Route Definitions (`admin.routes.ts`))*

#### 2.3.5. Prisma Schema (`prisma/schema.prisma`)

*   **Responsibility:** Defines the database models, fields, types, relationships, indexes, and constraints declaratively.
*   Acts as the single source of truth for the database structure.
*   Refer to Chapter 5 for detailed schema design standards.

*(Image 2.5: Example Prisma Schema Definition)*

#### 2.3.6. Formatting & Imports

*   **Formatting:** Use Prettier/ESLint for consistency (2-space indent, standard line length, semicolons).
*   **Imports:** Group imports (Node.js built-ins, third-party libraries, internal project modules). Use absolute paths (`@/*`) configured via `tsconfig.json` where available to improve clarity and reduce relative path complexity.

### 2.4. Error Handling

*   Use `try...catch` in controllers/services.
*   Utilize a central handler (`src/utils/handle-utils.ts`).
*   Return meaningful HTTP status codes (4xx, 5xx).
*   Respond with JSON: `{ "message": "Error description", "code": "OPTIONAL_ERROR_CODE" }`.

*(Image 2.6: Error Handling Example (`handleError` usage in a controller))*

### 2.5. Documentation

*   Use JSDoc (`/** ... */`) for public APIs (functions, classes, interfaces).
*   Document `@param`, `@returns`, `@throws`.
*   Focus on *why*, not just *what* (if obvious).

*(Image 2.7: Documentation Example (JSDoc for a service method))*

### 2.6. Middleware

*   Use for cross-cutting concerns (auth, validation, logging, caching).
*   Keep middleware focused (single responsibility).

### 2.7. Environment Variables

*   Use `.env` for secrets and config (DB URLs, API keys, `JWT_SECRET`).
*   Load with `dotenv`.
*   Use `.env.example`; **never** commit `.env`.

## CHAPTER 3. FRONTEND

### 3.1. Core Technologies

*   **Language:** TypeScript (`strict` mode enabled).
*   **Framework:** React with Next.js (App Router).
*   **Styling:** Tailwind CSS.
*   **Package Manager:** npm.

### 3.2. Naming Conventions

*   **Component/Layout Files:** PascalCase (`Sidebar.tsx`, `PlayerBar.tsx`).
*   **Page/Route Files (in `app/`):** kebab-case (`user-profile/page.tsx`, `forgot-password/page.tsx`).
*   **Utility/Context/Hook Files:** camelCase or PascalCase depending on export (`api.ts`, `ThemeContext.tsx`, `useDataTable.tsx`).
*   **Components/Types/Interfaces:** PascalCase (`PlayerBar`, `UserProfile`, `StatsCard`).
*   **Hooks:** camelCase, prefixed with `use` (`useTheme`, `useDataTable`, `useAuth`).
*   **Functions/Variables:** camelCase (`fetchWithAuth`, `isLoading`, `handlePlayTrack`).

### 3.3. Structure & Formatting

*   **Folder Structure:** Use Next.js App Router (`app/`) convention with route groups (`(admin)`, `(artist)`, `(auth)`, `(main)`). Organize shared code logically:
    *   `components/`: Reusable UI components (further subdivided by feature or type like `ui/`, `layout/`, `admin/`, `user/`).
    *   `contexts/`: Global state management contexts (`ThemeContext`, `TrackContext`, etc.).
    *   `hooks/`: Custom React hooks (`useDataTable`, `useAuth`).
    *   `lib/`: General utility functions (`utils.ts`).
    *   `types/`: Shared TypeScript types and interfaces (`index.ts`).
    *   `utils/`: Specific utilities like API helpers (`api.ts`), configuration (`config.ts`), etc.
*   **Formatting:** Use Prettier/ESLint to enforce consistent code style (indentation, spacing, quotes, etc.).
*   **Imports:** Group imports (React/Next, external libraries, internal absolute `@/*`, relative `./`). Use absolute paths (`@/*`) configured in `tsconfig.json` for imports outside the current module directory.

*(Image 3.1: Frontend Project Folder Structure (`tree /f /a` output))*

### 3.4. Component Architecture

*   **Functional Components & Hooks:** Exclusively use functional components with React Hooks (`useState`, `useEffect`, `useContext`, `useCallback`, etc.). Avoid class components.
*   **Props:** Define component props using TypeScript interfaces for type safety and clarity. Keep interfaces focused on the component's needs.
    ```typescript
    // Example: src/components/admin/StatsCard.tsx
    interface StatsCardProps {
      icon: React.ElementType;
      iconColor: string;
      count: number | string;
      title: string;
      description: string;
      href?: string; // Optional prop
    }

    export function StatsCard({ icon: Icon, iconColor, count, title, description, href }: StatsCardProps) {
      // ... component logic using props
    }
    ```
    *(Image 3.2: Example Component Props Interface (`StatsCardProps`))*
*   **Component Granularity:** Decompose complex UIs into smaller, single-purpose, reusable components (e.g., `Button`, `Input`, `Card` in `components/ui/`, feature-specific components like `TrackList`, `PlayerBar`).
*   **Server vs. Client Components (Next.js App Router):**
    *   Default to Server Components for data fetching, accessing backend resources directly, and reducing client-side JavaScript.
    *   Use the `'use client';` directive at the top of files for components that need interactivity, state (`useState`), lifecycle effects (`useEffect`), or browser-only APIs (`localStorage`). Examples: `PlayerBar`, forms (`login/page.tsx`), components using Context (`layout.tsx`).

### 3.5. State Management

*   **Local State:** Use `useState` for state confined to a single component (e.g., form input values, modal visibility).
*   **Global/Shared State:** Use React Context API (`createContext`, `useContext`) for state needed across multiple components or levels of the tree. This project uses contexts for:
    *   `ThemeContext`: Managing light/dark theme.
    *   `TrackContext`: Managing the currently playing track, queue, and player state.
    *   `MaintenanceContext`: Tracking system maintenance mode.
    *   `BackgroundContext`: Managing dynamic background styles.
    *   Encapsulate context logic within custom provider components.
    ```typescript
    // Example: src/contexts/ThemeContext.tsx (Conceptual)
    import { createContext, useContext, useState, ReactNode } from 'react';

    interface ThemeContextType {
      theme: 'light' | 'dark';
      toggleTheme: () => void;
    }

    const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

    export const ThemeProvider = ({ children }: { children: ReactNode }) => {
      const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default theme
      // ... logic to load preference, toggle theme ...
      const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

      return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          {children}
        </ThemeContext.Provider>
      );
    };

    export const useTheme = (): ThemeContextType => {
      const context = useContext(ThemeContext);
      if (!context) throw new Error('useTheme must be used within a ThemeProvider');
      return context;
    };
    ```
    *(Image 3.3: Example Context Provider (`ThemeProvider`))*
*   **Complex State:** If state logic becomes overly complex within Context, consider libraries like Zustand or Redux Toolkit, but prefer Context API for simplicity initially.

### 3.6. Styling

*   **Primary Method:** Use **Tailwind CSS** utility classes directly within JSX for most styling.
*   **Consistency:** Adhere to the project's design system and Tailwind configuration (`tailwind.config.ts`).
*   **Dynamic Classes:** Use template literals or libraries like `clsx` / `tailwind-merge` for conditionally applying classes based on props or state.
    ```jsx
    // Example: Responsive and conditional styling
    function ResponsiveCard({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
      return (
        <div
          className={`
            p-4 border rounded shadow-sm 
            w-full md:w-1/2 lg:w-1/3 // Responsive width
            ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          `}
        >
          {children}
        </div>
      );
    }
    ```
    *(Image 3.4: Example Conditional & Responsive Styling with Tailwind)*
*   **Responsiveness:** Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) to create adaptive layouts.
*   **Custom CSS:** Avoid custom CSS files unless absolutely necessary for complex animations, overrides, or third-party library styling that cannot be achieved with Tailwind. If needed, use CSS Modules for scoping.

### 3.7. API Interaction

*   **Centralized Logic:** Use the utility module `src/utils/api.ts` to encapsulate `fetch` calls and handle common logic like base URL, headers, and authentication tokens.
*   **Authentication:** Retrieve the JWT token from `localStorage` and include it in the `Authorization: Bearer <token>` header for protected requests (as handled by `fetchWithAuth` in `api.ts`).
*   **Data Fetching:**
    *   In Server Components, fetch data directly (using `async`/`await` with the API utility).
    *   In Client Components, use `useEffect` combined with `useState` for loading/error/data states, or utilize custom hooks (like `useDataTable`) to manage this logic.
*   **Loading & Error States:** Always provide visual feedback to the user during API requests (loading indicators) and display clear error messages if requests fail.

```typescript
// Example: Data Fetching in src/app/(main)/profile/[id]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { User } from '@/types';

const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [token, setToken] = useState<string | null>(null);
const { id } = use(params); 

useEffect(() => {
  const storedToken = localStorage.getItem('userToken');
  if (!storedToken) {
    setIsLoading(false);
    return;
  }
  setToken(storedToken);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userResponse = await api.user.getUserById(id, storedToken);
      setUser(userResponse);
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  fetchUserData();
}, [id]);

if (isLoading) return <div>Loading profile...</div>;
if (error) return <div className="text-red-500">Error: {error}</div>;


```
*(Image 3.5: Example API Data Fetching in a Client Component)*

### 3.8. Error Handling

*   **API Calls:** Use `try...catch` blocks around `fetch` calls within the API utility (`api.ts`) or, more commonly, in the component/hook data fetching logic where the call is initiated.
*   **User Feedback:** Use `react-hot-toast` (imported as `toast`) to display non-intrusive notifications for success or failure of user-initiated operations (e.g., saving data, deleting items, following users).
*   **Component Errors:** Render specific error UI states within components when data fetching fails (as shown in the example above) or critical errors occur.
*   **Global Errors:** Consider using Next.js error handling mechanisms (e.g., `error.tsx` files) for unrecoverable errors.

```typescript
// Example: Error handling with toast in src/app/(main)/profile/[id]/page.tsx
const handleFollow = async () => {
  if (!token) {
    router.push('/login');
    return;
  }

  try {
    if (follow) {
      await api.user.unfollowUserOrArtist(id, token);
      toast.success('Unfollowed user!');
      setFollow(false);
    } else {
      await api.user.followUserOrArtist(id, token);
      toast.success('Followed user!');
      setFollow(true);
    }
  } catch (error) {
    console.error(error);
    toast.error('Failed to follow user!');
  }
};
```
*(Image 3.6: Example User Feedback with `react-hot-toast`)*

### 3.9. Documentation

*   **Components:** Use JSDoc comments (`/** ... */`) to explain the purpose of components and their props. Use TypeScript interfaces for defining prop types.
*   **Hooks:** Document custom hooks, explaining their purpose, parameters, and return values.
*   **Contexts:** Document the purpose of each context and the data/functions it provides.
*   **Utility Functions:** Document complex or non-obvious utility functions in `utils/` or `lib/`.

```typescript
// Example: JSDoc for src/hooks/useDataTable.tsx (Assuming structure)
/**
 * @template T The type of data items in the table.
 * @param config Configuration options including the data fetching function, limit, etc.
 * @returns An object containing table state (data, loading, error, pagination)
 *          and functions to update table parameters (page, search).
 */
export function useDataTable<T>(config: UseDataTableConfig<T>): UseDataTableReturn<T> {
  const { fetchData, limit, initialPage = 1, initialSearch = '' } = config;

  return {
    data,
    setData,
    loading,
  };
}
```
*(Image 3.7: Example JSDoc for a Custom Hook (`useDataTable`))*

## CHAPTER 4. API COMMUNICATION STANDARDS

### 4.1. Principles

*   **RESTful:** Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE).
*   **Stateless:** Server relies on JWT, not session state.
*   **Resource URLs:** Nouns for resources (`/api/users`), URL params for IDs (`/api/users/:id`), query params for filtering/sorting/pagination (`/api/tracks?genre=rock&page=2`).

### 4.2. Request/Response Format

*   **Format:** JSON for bodies.
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>` (when needed).
*   **Success:** `200 OK`, `201 Created` (with `Location` header), `204 No Content`. Consistent response structure (e.g., `{ data: ..., pagination: ... }`).
*   **Errors:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`. Consistent JSON structure: `{ message: "...", code: "..." }`.

### 4.3. Authentication & Authorization

*   **Auth:** JWT via `Authorization: Bearer <token>` header, validated by backend middleware.
*   **RBAC:** Backend middleware (`authorize`) restricts access based on roles (USER, ARTIST, ADMIN). Frontend handles 403 errors.

### 4.4. Versioning

*   Consider API versioning (e.g., `/api/v1/users`) if future breaking changes are likely.

### 4.5. Documentation

*   Document endpoints clearly (Swagger/OpenAPI or Markdown). Include URL, method, headers, body schema, response schemas, permissions.

## CHAPTER 5. DATABASE STANDARDS (PostgreSQL/Prisma)

### 5.1. Technology

*   **Database:** PostgreSQL.
*   **ORM:** Prisma (`prisma/schema.prisma`).
*   **Migrations:** Use `prisma migrate dev` (dev) and `prisma migrate deploy` (prod). Commit migration files.

### 5.2. Naming Conventions (`schema.prisma`)

*   **Models:** PascalCase, singular (`User`, `Album`). Mapped to `snake_case`, plural table names (`@@map("users")`).
*   **Fields:** camelCase (`artistName`, `createdAt`).
*   **Enums:** PascalCase (`Role`, `AlbumType`). Values: UPPERCASE_SNAKE_CASE (`NEW_TRACK`).
*   **Relations:** Descriptive camelCase (`artistProfile`, `likedBy`).

### 5.3. Schema Design

*   **PKs:** `String @id @default(cuid())`.
*   **Types:** Use appropriate Prisma/PostgreSQL types.
*   **Relations:** Define explicitly (`@relation`). Specify `onDelete` behavior (`Cascade`, `SetNull`, `Restrict`).
*   **Defaults:** Use `@default()` (`now()`, `cuid()`, `true`).
*   **Timestamps:** Include `createdAt @default(now())` and `updatedAt @updatedAt`.
*   **Nullability:** Avoid optional fields (`?`) unless `NULL` is explicitly meaningful.
*   **Indexes:** `@@index([...])` on frequently queried/filtered fields.
*   **Uniqueness:** `@unique` or `@@unique([...])`.

```prisma
// Example
model Track {
  id          String    @id @default(cuid())
  title       String
  duration    Int       @default(0)
  releaseDate DateTime
  audioUrl    String
  playCount   Int       @default(0)
  isActive    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  artistId    String
  albumId     String?

  album       Album?    @relation(fields: [albumId], references: [id], onDelete: Cascade)
  artist      ArtistProfile @relation(fields: [artistId], references: [id], onDelete: Cascade)

  @@index([artistId])
  @@index([albumId])
  @@index([releaseDate])
  @@map("tracks")
}
```

### 5.4. Data Integrity

*   Use database constraints (defined in schema).
*   Implement application-level validation in backend services before CUD operations.

### 5.5. Querying

*   Use Prisma Client (`extendedPrisma`) within **services** only.
*   Leverage type safety.
*   Use `select`/`include` to fetch only needed data.
*   Define reusable select objects (`src/utils/prisma-selects.ts`).
*   Avoid N+1 problems; use `include` carefully or structure queries efficiently.

### 5.6. Prisma Extensions

*   Use `$extends` to encapsulate complex query logic, computed fields, or model helpers (e.g., for playlists, history). 