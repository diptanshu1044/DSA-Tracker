# DSA Tracker

Next.js (App Router) frontend and Express + MongoDB backend for tracking DSA practice.

## Stack

- **Frontend:** Next.js, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Zustand, TanStack Query
- **Backend:** Express, TypeScript, Mongoose, JWT, Google OAuth
- **Infra:** Docker Compose, Prettier, ESLint

## Getting started

```bash
# Install root tooling (optional concurrent scripts)
npm install

# Backend
cp backend/.env.example backend/.env
npm install --prefix backend

# Frontend
cp frontend/.env.example frontend/.env.local
npm install --prefix frontend

# Run both (requires MongoDB on mongodb://localhost:27017)
npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

## Auth API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Local registration |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/refresh` | Rotate access + refresh tokens |
| POST | `/api/auth/logout` | Clear cookies and revoke refresh |
| GET | `/api/auth/me` | Profile (Bearer or cookie) |
| POST | `/api/auth/forgot-password` | Issues reset token (logged in dev) |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| GET | `/api/auth/google` | Start Google OAuth |

Access tokens expire quickly (`JWT_ACCESS_EXPIRES_IN`, default `15m`). Refresh tokens last longer (`JWT_REFRESH_EXPIRES_IN`, default `7d`) and are rotated + stored hashed on the user.

## Problems & Revisions API

All endpoints require authentication (Bearer token or access cookie).

### Problems

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/problems` | Create problem (`title`, `url`, `attemptType`, optional `timeTaken`) |
| GET | `/api/problems` | Paginated list (`page`, `limit`, optional `attemptType`, `search`) |
| GET | `/api/problems/:id` | Get one problem |
| PATCH/PUT | `/api/problems/:id` | Update problem fields |
| DELETE | `/api/problems/:id` | Delete problem and its revisions |

- `attemptType`: `SELF` \| `HINT` \| `VIDEO`
- Duplicate URLs per user are rejected (`409`); URLs are normalized before compare
- Creating a problem also schedules default revisions (days 1, 3, 7, 15, 30)

### Revisions

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/revisions` | Create revision (`problemId`, `dueDate`, `revisionNumber`, optional `completed`) |
| GET | `/api/revisions` | Paginated list (`page`, `limit`, optional `problemId`, `completed`, `dueBefore`, `dueAfter`) |
| GET | `/api/revisions/:id` | Get one revision |
| PATCH/PUT | `/api/revisions/:id` | Update / mark complete |
| DELETE | `/api/revisions/:id` | Delete revision |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend + frontend |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm run typecheck` | Typecheck both apps |
