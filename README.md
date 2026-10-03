# Movie Library API Training Platform

Movie Library is a full-stack Next.js application for teaching REST API testing to beginner and intermediate QA engineers. The UI and Postman users both interact with the same public REST API, making it easy to inspect a browser request and reproduce it manually or automatically.

## Technology Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- Next.js Route Handlers for REST endpoints
- Prisma ORM with PostgreSQL, designed for Neon
- Zod validation
- OpenAPI 3.1 and Swagger UI
- Postman collection
- Vitest API tests
- Vercel deployment configuration

## Architecture

```mermaid
flowchart TD
  Browser --> UI[Next.js UI]
  UI --> API[REST API Route Handlers]
  Postman --> API
  API --> Services[Service Layer]
  Services --> Prisma[Prisma ORM]
  Prisma --> DB[(Neon PostgreSQL)]
```

The frontend never reads the database directly. All movie and workspace operations go through `/api`.

## Features

- Anonymous workspace creation with deterministic seed movies.
- Workspace-scoped movie CRUD.
- Search, genre filtering, watched filtering, sorting, and pagination.
- Strict Zod validation and consistent error responses.
- Duplicate prevention for case-insensitive movie title plus year within a workspace.
- Basic database-backed rate limiting for public write endpoints.
- Request inspector showing actual UI-generated HTTP requests and responses.
- Swagger UI at `/api-docs`.
- Postman collection at `postman/MovieLibrary.postman_collection.json`.
- Training guide at `docs/training-guide.md`.

## Anonymous Workspaces

Anonymous workspace IDs provide data separation for training. They are not authentication, authorization, or privacy controls. Anyone who has a workspace ID can use it to read, create, update, delete, or reset movies in that workspace. The architecture keeps workspace scoping explicit so real authentication can be added later.

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL database, preferably Neon for hosted development and production

## Local Installation

```bash
npm install
cp .env.example .env
```

Edit `.env` with PostgreSQL connection strings:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

For Neon, use the pooled connection for `DATABASE_URL` and the direct connection for `DIRECT_URL`.

## Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
```

Prisma migrations create `workspaces`, `movies`, and `rate_limit_buckets`. The migration also adds database constraints, indexes, and the case-insensitive unique index for duplicate movie prevention.

## Development Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

The app runs at `http://localhost:3000`.

## API Routes

- `POST /api/workspaces`
- `GET /api/workspaces/{id}`
- `POST /api/workspaces/{id}/reset`
- `GET /api/movies`
- `GET /api/movies/{id}`
- `POST /api/movies`
- `PUT /api/movies/{id}`
- `PATCH /api/movies/{id}`
- `DELETE /api/movies/{id}`

Movie endpoints require the `X-Workspace-ID` header.

## Swagger Documentation

Run the app and open:

```text
http://localhost:3000/api-docs
```

The OpenAPI JSON is available at:

```text
http://localhost:3000/api/openapi
```

## Postman Instructions

Import:

```text
postman/MovieLibrary.postman_collection.json
```

Set `baseUrl` to `http://localhost:3000` or your deployed URL. Run `Create workspace and save ID` first, then `Create movie and save ID`. The collection automatically saves `workspaceId` and `movieId` variables.

## Neon Configuration

1. Create a Neon project and PostgreSQL database.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Copy the direct connection string into `DIRECT_URL`.
4. Run `npm run prisma:migrate` locally for development, or `npm run prisma:deploy` from a trusted deployment/migration environment.
5. Do not run destructive migrations automatically at application startup.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the GitHub repository in Vercel.
3. Add environment variables: `DATABASE_URL`, `DIRECT_URL`, and optionally `NEXT_PUBLIC_APP_URL`.
4. Run `npm run prisma:deploy` against the production database before or during a controlled deploy step.
5. Deploy the project. Vercel uses `npm run build`.
6. Verify `/`, `/api-docs`, `POST /api/workspaces`, and `GET /api/movies` with a workspace header.

## Production Verification Checklist

- The homepage loads over HTTPS.
- Creating a workspace returns `201` and seeds movies.
- Movie CRUD endpoints work with `X-Workspace-ID`.
- Deleted movies return `404`.
- Swagger UI can execute requests against the deployed API.
- Postman collection passes with `baseUrl` set to the deployed URL.
- No `.env` or database credentials are committed.

## Known Limitations

- Anonymous workspaces are not private or secure.
- Rate limiting is intentionally basic and database-backed for serverless compatibility.
- The Vitest suite uses a deterministic in-memory repository adapter to exercise route handlers and services without touching production data. Production and local runtime use Prisma/PostgreSQL.
