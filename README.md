# CSC3213_20_Group_H

## Project Overview

This repository contains a split frontend/backend application for the CareBridge mental health support platform.

- `backend/` - Node.js Express API with MySQL, JWT authentication, Passport Google OAuth, and Socket.IO.
- `frontend/` - Next.js React app with login/register, anonymous access, dashboard, emergency help, availability, booking, session history, and voice call pages.

## Prerequisites

- Node.js 18+ (or a compatible modern Node version)
- npm
- MySQL database
- `.env` file in `backend/` with required variables

## Backend Setup

1. Open a terminal and change into the backend folder:

```sh
cd backend
```

2. Install dependencies:

```sh
npm install
```

3. Create a `.env` file in `backend/` with at least:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mind_ease_db
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

4. Start the backend server:

```sh
npm run dev
```

5. The backend API will run on:

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

1. Start the backend first.
2. Start the frontend.
3. Register or log in through the frontend.
4. Test emergency help and authenticated routes from the dashboard.
