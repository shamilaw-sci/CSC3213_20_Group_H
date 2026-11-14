# CareBridge (`CSC3213_20_Group_H`) — AI-Powered Mental Health Support & Early-Screening System

## Project Overview

CareBridge is a split-stack university mental health support and early-screening platform:

- **`backend/`** — Node.js + Express 5 API with MySQL (`mysql2`), JWT & Google OAuth authentication, Socket.IO real-time alerts, Google Gemini structured screening & document summarization, Gemini Live ephemeral token broker, deterministic safety/risk engine, PHQ-9 backend scoring, and SendGrid/Twilio emergency escalation.
- **`frontend/`** — Next.js 16 + React 18 + TypeScript + Tailwind CSS app with student/anonymous chat, PHQ-9 bilingual screening, real-time Gemini Live voice interaction, counsellor/admin clinical oversight dashboards, medical document upload/summary review, appointment booking, and emergency support.

> **Important Clinical Disclaimer:** CareBridge is a mental health support and early-screening prototype. It does **not** diagnose depression or replace professional medical assessment, does **not** automatically contact emergency services unless a verified integration confirms delivery, and requires human clinician review for all AI-generated document summaries.

---

## Prerequisites

- **Node.js 18+** (tested on Node `v24.16.0`) and **npm**
- **Docker Desktop** (for MySQL 8.0 and Adminer)
- **Google Gemini API Key** (`GEMINI_API_KEY` on the backend only)

---

## 1. Quick Start Guide

### Step 1: Start MySQL & Adminer (Docker)

1. Copy the root environment file:
   ```sh
   cp .env.example .env
   ```
2. Start the database containers:
   ```sh
   docker compose up -d
   docker compose ps
   ```
   - `docker-compose.yml` maps MySQL on host port `${DB_PORT:-3307}` to container port `3306`. Ensure `DB_PORT` in `backend/.env` matches your `.env` setting.
   - Adminer DB UI is available at `http://localhost:8080` (server `mysql`).

### Step 2: Configure & Start the Backend

1. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
2. Copy `backend/.env.example` to `backend/.env` and fill in your credentials (especially `DB_PORT`, `JWT_SECRET`, and `GEMINI_API_KEY`):
   ```env
   PORT=5050
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_USER=carebridge
   DB_PASSWORD=carebridge
   DB_NAME=mind_ease_db
   JWT_SECRET=change_this_to_a_long_random_string

   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-flash-latest
   GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
   GEMINI_LIVE_TTL_MINUTES=15

   ALERT_ESCALATION_MINUTES=5
   CRISIS_HELPLINE_PRIMARY=1926
   CRISIS_HELPLINE_SECONDARY=1333
   EMERGENCY_SERVICES_NUMBER=119
   CAMPUS_COUNSELLING_CONTACT=Use the Emergency Help button on screen
   ```
   *(Default port is `5050` to avoid macOS AirPlay Receiver conflicts on port `5000`.)*
3. Apply database migrations (creates new tables and columns idempotently on existing volumes):
   ```sh
   npm run migrate
   ```
4. Seed demo user accounts:
   ```sh
   npm run seed
   ```
   Seeded accounts from `backend/seed_user.js`:
   | Role | Email | Password |
   |---|---|---|
   | **Admin** | `admin@carebridge.com` | `admin123` |
   | **Counsellor** | `counsellor@carebridge.com` | `counsellor123` |
   | **Student** | `student@carebridge.com` | `password123` |

5. Start the backend server:
   ```sh
   npm run dev
   ```
   API runs at `http://localhost:5050`.

### Step 3: Configure & Start the Frontend

1. Install dependencies and configure env:
   ```sh
   cd frontend
   npm install
   cp .env.example .env.local
   ```
   `frontend/.env.local` should contain:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5050
   ```
   *(Never put `GEMINI_API_KEY` in `frontend/.env.local`.)*
2. Start the Next.js development server:
   ```sh
   npm run dev
   ```
   Frontend runs at `http://localhost:3000`.

---

## 2. How Each Feature Works

### A. AI Companion Chat (`/chat`)
1. Log in as a student (or click **Continue as Anonymous** on `/login`).
2. Open **`/chat`** (`frontend/app/chat/page.tsx`).
3. Send messages in **English**, **Sinhala (සිංහල)**, or **mixed Sinhala-English (Singlish)**.
4. Behind the scenes (`backend/src/services/screeningOrchestrator.js`):
   - `crisisDetector.js` runs deterministic English + Sinhala/Singlish self-harm and safety-uncertainty checks **before** calling Gemini.
   - `geminiService.js` generates a compassionate reply plus structured JSON screening signals (tentative emotions, depression domains, language, follow-up topics already covered so questions aren't repeated).
   - `riskEngine.js` validates Gemini's JSON and enforces deterministic safety overrides:
     - **Low Risk**: supportive conversation & coping tips.
     - **Moderate Risk**: creates a `follow_ups` record, notifies the assigned/on-call counsellor, and suggests booking a counsellor session.
     - **High Risk**: triggers an urgent `emergencies` alert, broadcasts over Socket.IO, records notifications + audit logs, asks direct safety check questions, and displays configured Sri Lanka / local helplines (`1926`, `1333`, `119`).

### B. PHQ-9 Depression Screening (`/chat` -> "PHQ-9 Screening")
1. Click **PHQ-9 Screening** inside `/chat` (or accept the prompt when suggested).
2. Questions 1–9 must be answered in sequential order (`0` to `3`), with an **English / සිංහල** toggle.
3. The backend (`backend/src/services/phq9Service.js`) calculates the total score (`0–27`) and severity band (`Minimal`, `Mild`, `Moderate`, `Moderately severe`, `Severe`).
4. **Question 9 Safety Workflow**: Reporting thoughts of death or self-harm (`>= 1` on Q9) immediately triggers a high-risk safety workflow and displays crisis helplines regardless of the total PHQ-9 score.

### C. Real-Time Voice Conversation via Gemini Live (`/chat` -> "Voice Live")
1. Click **Voice Live** (or the microphone button) in `/chat` and grant browser microphone permission.
2. Frontend calls `POST /api/voice/session`; the backend (`liveVoiceService.js`) uses `GEMINI_API_KEY` to mint a short-lived, single-use **ephemeral token** (`uses: 1`) so permanent credentials never reach the browser.
3. Browser (`frontend/components/GeminiLiveVoice.tsx`) streams 16 kHz PCM audio to Gemini Live and plays 24 kHz audio responses with **Mute Mic**, **Mute Audio**, **Interrupt**, **Reconnect**, and **End Voice** controls.
4. Each completed voice turn's transcript is sent to `POST /api/voice/turn`, running the **exact same** `processPatientTurn` safety validation, risk assessment, and emergency escalation workflow as text chat.
*(Note: `/voice-call` remains preserved for peer-to-peer WebRTC calls with human counsellors.)*

### D. Admin & Counsellor Dashboards (`/admin/dashboard`, `/counsellor/dashboard`, `/clinical/patients/[patientId]`)
1. Log in as **Admin** (`admin@carebridge.com`) or **Counsellor** (`counsellor@carebridge.com`).
2. **Risk Overview & Filters**: View Low/Moderate/High patient counts, unreviewed assessments, urgent alerts, and pending follow-ups; filter by risk level, counsellor, follow-up status, date range, or search query.
3. **Alert Acknowledgement & Escalation**: Acknowledge incoming alerts, record resolution outcomes, or run overdue escalation checks (`ALERT_ESCALATION_MINUTES`).
4. **Counsellor Assignment & Notes**: Admins can assign/reassign patients to available counsellors; counsellors and admins can record clinical notes, follow-up statuses, actions taken, and outcomes (all persisted to `audit_logs`).
5. **Patient Detail & Progress Charts (`/clinical/patients/[patientId]`)**: Review full text/voice conversation transcripts, PHQ-9 score trends over time, risk assessment history (with human override capability), and itemized PHQ-9 answers.

### E. Patient Medical History Document Upload & AI Summaries
1. Open any patient record at **`/clinical/patients/[patientId]`**.
2. Upload `.pdf`, `.txt`, `.md`, `.csv`, or `.json` files (up to 10 MB).
3. Check the **consent confirmation** box before sending extracted text to Gemini (`documentService.js` + `summarizeMedicalDocument`).
4. The AI summary separates **Documented Facts** from **AI Attention Notes** (never inventing missing details) and remains marked `pending_review` until a clinician clicks **Mark Reviewed**.

---

## 3. Running Tests

Run the backend unit & validation test suite (uses Node's built-in `node --test` runner):

```sh
cd backend
npm test
```

Run frontend TypeScript type checking:

```sh
cd frontend
npx tsc --noEmit
```

---

## 4. Key API Endpoints

| Area | Endpoints |
|---|---|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/register/anonymous`, `GET /api/auth/google` |
| **Chat & AI** | `GET /api/chat`, `POST /api/chat`, `GET /api/chat/conversations`, `POST /api/chat/conversations` |
| **PHQ-9** | `GET /api/phq9/questions`, `POST /api/phq9/start`, `POST /api/phq9/:screeningId/answer`, `GET /api/phq9/history`, `GET /api/phq9/patient/:patientId` |
| **Gemini Live Voice** | `POST /api/voice/session`, `POST /api/voice/turn` |
| **Notifications** | `GET /api/notifications`, `PUT /api/notifications/:id/read` |
| **Clinical Oversight** | `GET /api/clinical/overview`, `GET /api/clinical/patients`, `GET /api/clinical/patients/:patientId`, `PUT /api/clinical/risk-assessments/:id/review` |
| **Alerts & Follow-Ups** | `GET /api/clinical/alerts`, `PUT /api/clinical/alerts/:id/acknowledge`, `PUT /api/clinical/alerts/:id/resolve`, `POST /api/clinical/alerts/escalate-overdue`, `POST /api/clinical/patients/:patientId/notes`, `POST /api/clinical/patients/:patientId/follow-ups`, `PUT /api/clinical/follow-ups/:id` |
| **Counsellor Assignment** | `GET /api/clinical/counsellors`, `POST /api/clinical/assignments` |
| **Medical Documents** | `POST /api/clinical/patients/:patientId/documents`, `GET /api/clinical/documents/:docId/download`, `POST /api/clinical/documents/:docId/summarize`, `PUT /api/clinical/document-summaries/:summaryId/review` |
| **Emergency & Admin** | `POST /api/emergency`, `GET /api/admin/analytics`, `GET /api/admin/reports/:format`, `PUT /api/admin/counsellors/:counsellorId/verify` |
