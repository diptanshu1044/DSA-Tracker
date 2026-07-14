# DSA Tracker

Next.js (App Router) frontend and Express + MongoDB backend for tracking DSA practice with spaced revision scheduling.

## Stack

- **Frontend:** Next.js, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Zustand, TanStack Query
- **Backend:** Express, TypeScript, Mongoose, JWT, Google OAuth, optional SMTP
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

## Environment notes

- Set distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` (required to differ in production).
- Configure `SMTP_*` for password-reset emails in production. In development, reset links are returned in the API response when SMTP is unset.
- Set `NEXT_PUBLIC_API_URL` for the frontend (Docker builds accept it as a build arg).

## Auth API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Local registration (rate limited) |
| POST | `/api/auth/login` | Email/password login (rate limited) |
| POST | `/api/auth/refresh` | Rotate access + refresh tokens |
| POST | `/api/auth/logout` | Clear cookies and revoke refresh |
| GET | `/api/auth/me` | Profile (Bearer or cookie) |
| GET | `/api/auth/session` | Exchange cookie session for SPA tokens (OAuth) |
| POST | `/api/auth/forgot-password` | Issues reset token / sends email |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| GET | `/api/auth/google` | Start Google OAuth |

Access tokens expire quickly (`JWT_ACCESS_EXPIRES_IN`, default `15m`). Refresh tokens last longer (`JWT_REFRESH_EXPIRES_IN`, default `7d`) and are rotated + stored hashed on the user.

Google OAuth sets httpOnly cookies and redirects to `/auth/callback` with **no tokens in the URL**. The SPA calls `/auth/session` to hydrate local storage.

## Problems & Revisions API

All endpoints require authentication (Bearer token or access cookie).

### Problems

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/problems` | Create problem (`title`, `url`, `attemptType`, optional `timeTaken`) |
| GET | `/api/problems` | Paginated list (`page`, `limit`, optional `attemptType`, `search`) |
| GET | `/api/problems/:id` | Get one problem |
| PATCH/PUT | `/api/problems/:id` | Update problem fields (reschedules pending revisions on attemptType change) |
| DELETE | `/api/problems/:id` | Delete problem and its revisions |

- `attemptType`: `SELF` \| `HINT` \| `VIDEO`
- Duplicate URLs per user are rejected (`409`); URLs are normalized before compare
- Creating a problem schedules revisions by attempt type: **SELF** = none; **HINT/VIDEO** = due in **1 and 7 days** (UTC midnight)
- Pending revision backlog over the limit blocks creating new problems

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
