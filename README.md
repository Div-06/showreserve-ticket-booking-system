# ShowReserve — Production-Grade Ticket Booking Engine

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat&logo=Prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-orange?style=flat)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

A high-performance, concurrency-resilient Ticket Booking Platform for movies and concerts built with **NestJS, PostgreSQL, Prisma, Redis, BullMQ, Socket.io, and React**.

Designed for high-demand ticket releases with **zero double-booking races**, **automatic 10-minute hold TTL expiration**, **category-based FIFO waitlists with automated cancellation reallocation**, and **cryptographic QR-code ticket delivery**.

---

## 📦 Repository

- **GitHub**: [https://github.com/Div-06/showreserve-ticket-booking-system](https://github.com/Div-06/showreserve-ticket-booking-system)

---

## 🌐 Deployment & Access

| Service | Environment / URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | React 18 + Vite interactive seat map application |
| **Backend API** | `http://localhost:3000/api` | NestJS REST API with rate limiting and JWT auth |
| **Swagger API Docs** | `http://localhost:3000/api/docs` | Interactive OpenAPI documentation & schema explorer |

> *Production Deployment Note*: The application is structured for cloud deployment (Frontend on Vercel, Backend + PostgreSQL + Redis on Render / Railway). Environment templates are provided in `.env.example`.

---

## 1. System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                 React + TypeScript Frontend                 │
 │            (Vite, Tailwind CSS, Lucide, Socket.io)          │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / WSS
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    NestJS Backend API                       │
 │  ┌───────────────────────┐       ┌───────────────────────┐  │
 │  │ Controllers & Guards  │ ────► │  Application Services │  │
 │  │ (JWT, RBAC, Swagger)  │       │ (Hold, Booking, Wait) │  │
 │  └───────────────────────┘       └───────────┬───────────┘  │
 │                                              │              │
 │  ┌───────────────────────┐       ┌───────────▼───────────┐  │
 │  │ Socket.io Gateway     │ ◄──── │ Event Dispatcher /    │  │
 │  │ (show:{id} rooms)     │       │ BullMQ Job Handlers   │  │
 │  └───────────────────────┘       └───────────────────────┘  │
 └──────────────┬───────────────────────────────┬──────────────┘
                │                               │
                ▼                               ▼
 ┌──────────────────────────────┐ ┌─────────────────────────────┐
 │       PostgreSQL (Prisma)    │ │        Redis + BullMQ       │
 │ - Authoritative Data Store   │ │ - Fast Coordination/Locking │
 │ - Row-Level Lock (FOR UPDATE)│ │ - Delayed Expiry Jobs (Hold)│
 │ - Strict Constraints & ACID  │ │ - Delayed Expiry (Waitlist) │
 └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Core Feature Highlights

### 🎟️ Customer Features
- **Visual Interactive Seat Map**: Real-time structured seating grid with distinct color codes:
  - 🟢 **Available**
  - 🔵 **Held by You** (with live countdown timer)
  - 🟠 **Held by Someone Else**
  - 🔴 **Booked**
- **Distributed Seat Holds**: Configurable 10-minute hold TTL (`HOLD_TTL_SECONDS`).
- **Instant Checkout & QR Pass**: Generates non-sequential booking references (`TKT-XXXXXXXX`) and signed HMAC-SHA256 QR code tickets with Nodemailer delivery.
- **Booking Management & Cancellation**: View tickets anytime with 1-click cancellation.
- **Category FIFO Waitlist**: Sold-out shows allow joining waitlists with automated 15-minute claim offers on cancellations.

### 🎪 Organiser Portal
- **Dashboard & Analytics**: Live revenue tracking ($), tickets sold by category (VIP, Premium, Standard), confirmed bookings, and cancellation monitoring.
- **Event & Showtime Management**: Create movie/concert listings and schedule showtimes with tiered pricing.

### 🛡️ System Administration
- **Venue Builder**: Structured matrix generation of rows, columns, aisles, and seat category distributions.
- **Platform Monitoring**: Global platform metrics across users, venues, active holds, and waitlist queues.

---

## 3. Database Schema & Entity Relationships

```mermaid
erDiagram
    User ||--o{ RefreshToken : has
    User ||--o{ Event : organizes
    User ||--o{ Hold : places
    User ||--o{ Booking : makes
    User ||--o{ WaitlistEntry : joins

    Venue ||--o{ Seat : contains
    Venue ||--o{ Show : hosts

    Event ||--o{ Show : has

    Show ||--o{ ShowSeat : includes
    Show ||--o{ Hold : receives
    Show ||--o{ Booking : receives
    Show ||--o{ WaitlistEntry : queues

    Seat ||--o{ ShowSeat : mapped_to

    ShowSeat ||--o| Hold : holds
    ShowSeat ||--o| Booking : booked_in
    ShowSeat ||--o{ BookingSeat : referenced_by
    ShowSeat ||--o{ WaitlistOffer : offered_in

    Booking ||--|{ BookingSeat : contains
    WaitlistEntry ||--o{ WaitlistOffer : receives
```

---

## 4. Concurrency Protection & Seat Hold Mechanism

**Redis provides fast distributed coordination, while PostgreSQL row-level locking and transactional state transitions provide the authoritative correctness guarantee.**

1. **Distributed Lock (Redis)**: Atomic `SET seat-lock:{showId}:{seatId} {uuid} NX PX 5000` sheds burst traffic early, rejecting overlapping requests with `409 Conflict`.
2. **Row-Level Lock (PostgreSQL `SELECT ... FOR UPDATE`)**: Authoritative database transactions lock physical seat rows inside PostgreSQL:
   ```sql
   SELECT "id", "showId", "status", "holdExpiresAt"
   FROM "ShowSeat"
   WHERE "id" = ANY($1::text[])
   FOR UPDATE;
   ```
3. **Delayed TTL Expiration**: BullMQ delayed jobs (`hold-expiry-queue`) automatically release uncompleted checkouts upon expiry and broadcast status updates via WebSocket.

---

## 5. Waitlist FIFO Reallocation Logic

Waitlists are partitioned per `(showId, seatCategory)` and strictly **FIFO ordered by creation timestamp**:

1. When a booking is cancelled, an atomic transaction looks up the first eligible entry in the waitlist:
   ```sql
   SELECT * FROM "WaitlistEntry"
   WHERE "showId" = $1 AND "category" = $2 AND "status" = 'WAITING'
   ORDER BY "createdAt" ASC
   LIMIT 1 FOR UPDATE;
   ```
2. The customer receives a **time-limited waitlist offer** (15-minute TTL) with a cryptographically secure claim link.
3. If the offer expires, the BullMQ worker automatically reallocates the seat to the **next customer in the FIFO line**.

---

## 6. Setup & Running

### Option A: Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/Div-06/showreserve-ticket-booking-system.git
   cd showreserve-ticket-booking-system
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Run the full stack with Docker Compose:
   ```bash
   docker compose up --build
   ```
4. Access the applications:
   - **Frontend UI**: `http://localhost:5173`
   - **Backend API**: `http://localhost:3000/api`
   - **Swagger OpenAPI Docs**: `http://localhost:3000/api/docs`

---

### Option B: Local Manual Execution

#### 1. Backend Setup
```bash
cd backend
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

#### 2. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

---

## 7. Environment Variables (`.env.example`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP Port | `3000` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://postgres:postgres@localhost:5432/ticket_booking?schema=public` |
| `REDIS_URL` | Redis Connection String | `redis://localhost:6379` |
| `JWT_SECRET` | JWT Access Token Secret Key | `production_jwt_access_secret_key_8f9a2b1c` |
| `JWT_REFRESH_SECRET` | JWT Refresh Token Secret Key | `production_jwt_refresh_secret_key_7e6d5c4b` |
| `JWT_ACCESS_EXPIRES_IN` | Access Token Lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token Lifetime | `7d` |
| `HOLD_TTL_SECONDS` | Seat Hold Countdown Duration | `600` (10 minutes) |
| `WAITLIST_OFFER_TTL_SECONDS` | Waitlist Claim Duration | `900` (15 minutes) |
| `QR_SECRET` | HMAC-SHA256 Secret for QR Signatures | `qr_production_hmac_signing_key_4499` |
| `FRONTEND_URL` | Frontend Origin for CORS | `http://localhost:5173` |
| `BACKEND_URL` | Backend Origin for Links/QR | `http://localhost:3000` |

---

## 8. Demo Accounts

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@example.com` | `Admin@123` | Venue Builder, Platform Analytics, Full Access |
| **Event Organiser** | `organiser@example.com` | `Organiser@123` | Event Creation, Showtime Scheduling, Revenue Dashboard |
| **Customer 1** | `customer@example.com` | `Customer@123` | Seat Booking, Interactive Seat Map, Tickets, Cancellations |
| **Customer 2** | `sarah@example.com` | `Customer@123` | Multi-User Concurrency Testing, Waitlist Queue Claims |

> **Tip**: The Login screen features **1-Click Demo Login buttons** to sign in instantly as any role.

---

## 9. Automated Testing & Verification Evidence

Execute all test suites from the `backend/` directory:

### 1. High-Concurrency Race Test (20 Simultaneous Requests on Same Seat)
```bash
npm run test:concurrency
```
*Fires 20 simultaneous HTTP requests for the exact same seat. Asserts that exactly 1 request succeeds (HTTP 201) and 19 requests are cleanly rejected (HTTP 409 Conflict), verifying the authoritative PostgreSQL row lock.*

### 2. Hold TTL Auto-Release Verification Test
```bash
npx ts-node test/test-hold-expiry.ts
```
*Places a hold on an available seat, verifies HELD state, triggers/simulates TTL expiration, and verifies automatic transition back to AVAILABLE in both PostgreSQL and REST API.*

### 3. Waitlist Offer Expiry & Cascading Allocation Test
```bash
npx ts-node test/test-waitlist-expiry.ts
```
*Customer A cancels booking → Customer B gets offer → Customer B abandons offer → 15-minute TTL expires → Customer C automatically receives next offer → Customer C claims and books seat.*

### 4. Optical QR Barcode Scan & HMAC Signature Verification Test
```bash
npx ts-node test/test-qr-decode.ts
```
*Decodes generated PNG ticket image pixel matrix with optical QR reader (`jsQR`), parses payload JSON, and cryptographically validates the HMAC-SHA256 signature and anti-counterfeiting checks.*

### 5. End-to-End Workflow Integration Test
```bash
npm run test:e2e
```

### 6. Unit Tests
```bash
npm test
```

---

## 🎯 10. 5-Minute Reviewer Demo Guide

Follow these steps to demonstrate every core mechanism in under 5 minutes:

1. **Sign In**: Navigate to `http://localhost:5173/login` and click **Customer (John)**.
2. **Browse Events & Select Show**: Click **Interstellar: 10th Anniversary IMAX Experience** -> Click **Select Seats**.
3. **Visual Seat Map & Hold**:
   - Select Seat **A1**.
   - Click **Hold & Proceed ⚡**.
   - Observe the **live 10-minute hold countdown timer** in the top navigation bar.
4. **Real-Time Cross-Browser Concurrency**:
   - Open an Incognito window, visit the same show page, and sign in as **Customer 2 (Sarah)**.
   - Observe that Seat **A1** is displayed as 🟠 **Held by Someone Else** and cannot be clicked.
5. **Checkout & Mock Payment**:
   - In Customer 1's window, click **Checkout Now**.
   - Click **Confirm & Pay $45.00**.
   - Observe the celebratory **confetti animation**, confirmed reference (`TKT-XXXXXXXX`), and **scannable QR ticket**.
6. **Cancellation & Automatic FIFO Waitlist Reallocation**:
   - In Customer 2's window, join the **VIP Waitlist** for this show.
   - In Customer 1's window, navigate to **My Tickets** and click **Cancel**.
   - Notice the notification: the seat is automatically reallocated to Customer 2!
   - In Customer 2's window, navigate to **My Tickets** or the emailed claim link to accept the offer and complete the booking!
7. **Organiser Analytics**:
   - Log in as `organiser@example.com` and visit the **Organiser Portal** to view live revenue and tickets sold by category.
8. **Admin Venue Builder**:
   - Log in as `admin@example.com` and visit **Admin Venues** to design structured venue matrices with custom aisles and categories.

---

## 11. API Documentation (Swagger/OpenAPI)

Interactive API documentation and schema definitions are accessible at:
`http://localhost:3000/api/docs`
