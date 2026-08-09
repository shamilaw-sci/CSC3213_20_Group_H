# CSC3213_20_Group_H

## Project Overview

This repository contains a split frontend/backend application for the CareBridge mental health support platform.

- `backend/` - Node.js Express API with MySQL, JWT authentication, Passport Google OAuth, and Socket.IO.
- `frontend/` - Next.js React app with login/register, anonymous access, dashboard, emergency help, availability, booking, session history, and voice call pages.

## Prerequisites

- Node.js 18+ (or a compatible modern Node version)
- npm
- Docker Desktop (for the MySQL database)
- `.env` files (see below)

## Database Setup (Docker)

MySQL runs as a Docker container so nobody needs a local MySQL install. The schema
(`backend/db/init/001_schema.sql`) is applied automatically the first time the
container starts, via MySQL's `docker-entrypoint-initdb.d` mechanism.

1. From the repo root, copy the compose env file and adjust if needed:

```sh
cp .env.example .env
```

2. Start the database (and Adminer, a web UI for browsing tables):

```sh
docker compose up -d
```

3. Verify it's healthy:

```sh
docker compose ps
```

- MySQL is reachable at `localhost:3306`.
- Adminer (DB browser) is at `http://localhost:8080` — server `mysql`, using the
  `DB_USER`/`DB_PASSWORD`/`DB_NAME` values from `.env`.

To stop the database: `docker compose down` (add `-v` to also wipe the data volume
and re-run the init scripts from scratch next time).

If you change `backend/db/init/*.sql` after the container's first run, those
scripts won't re-run automatically — run `docker compose down -v && docker compose up -d`
to recreate the volume, or apply the SQL manually.

## Backend Setup

1. Open a terminal and change into the backend folder:

```sh
cd backend
```

2. Install dependencies:

```sh
npm install
```

3. Create a `.env` file in `backend/` (copy `backend/.env.example`) with values
   matching the database container's credentials from the root `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=carebridge
DB_PASSWORD=carebridge
DB_NAME=mind_ease_db
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

4. (Optional) Seed demo accounts (admin + student):

```sh
npm run seed
```

5. Start the backend server:

```sh
npm run dev
```

The server checks the database connection on startup and exits with a clear
error if it can't reach MySQL (e.g. the Docker container isn't running yet).

6. The backend API will run on:

- `http://localhost:5000`

## Frontend Setup

1. Open a terminal and change into the frontend folder:

```sh
cd frontend
```

2. Install dependencies:

```sh
npm install
```

3. Start the Next.js development server:

```sh
npm run dev
```

4. The frontend will run on:

- `http://localhost:3000`

## Notes

- The frontend currently expects the backend API at `http://localhost:5000/api`.
- The emergency endpoint is available at `http://localhost:5000/api/emergency`.
- The auth routes are available under `http://localhost:5000/api/auth`.
- Google OAuth is only enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are provided.

## Recommended Development Flow

1. Start the database: `docker compose up -d` (from repo root).
2. Start the backend (`backend/`): `npm run dev`.
3. Start the frontend (`frontend/`): `npm run dev`.
4. Register or log in through the frontend.
5. Test emergency help and authenticated routes from the dashboard.
