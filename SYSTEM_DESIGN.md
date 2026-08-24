# System Design Document: High-Demand Ticket Booking Engine

**Author**: Senior Full-Stack Engineer  
**Scope**: Seat Hold & TTL, Concurrency Isolation, FIFO Waitlist Auto-Assignment, and Time-Limited Offers.

---

## 1. Seat Hold and TTL Auto-Release Mechanism

High-concurrency ticket reservations require decoupling interactive seat selection from final payment while guaranteeing strict hold validity. 

```
Customer Selection ──► Redis Distributed Lock ──► PostgreSQL Transaction (FOR UPDATE)
                                                          │
   ┌──────────────────────────────────────────────────────┴───────────────────────────┐
   ▼                                                                                  ▼
Update Status = HELD, holdExpiresAt = now + TTL                            Schedule BullMQ Delayed Job
Broadcast WebSocket 'HELD'                                                (Delay = HOLD_TTL_SECONDS)
```

1. **State Isolation**: When a customer selects seats, a `Hold` record is created with `status: ACTIVE` and `expiresAt: now() + HOLD_TTL_SECONDS` (configurable, default 600s). The `ShowSeat` entities transition to `status: HELD`.
2. **Authoritative Expiration (BullMQ + PostgreSQL)**: A delayed job is enqueued in BullMQ (`hold-expiry-queue`) with `delay = HOLD_TTL_SECONDS * 1000`. Upon execution, the worker runs an atomic transaction:
   - Locks the target `Hold` row.
   - If `status === ACTIVE` and `expiresAt <= now()`, marks the hold `EXPIRED`.
   - Reverts associated `ShowSeat` rows with `status = HELD` back to `AVAILABLE` (leaving `BOOKED` seats untouched).
   - Broadcasts real-time WebSocket event `seat:status_changed` (`status: AVAILABLE`) to room `show:{showId}`.
3. **Idempotency**: If the customer completes checkout prior to expiration, the hold status transitions to `CONVERTED`. When the delayed worker triggers, it detects `status !== ACTIVE` and exits safely without mutating seat states.

---

## 2. Concurrency Prevention & Multi-Layer Race Protection

To guarantee that two users can never hold or purchase the exact same seat simultaneously, the architecture implements a **two-tier defense-in-depth model**:

```
Request A ──┐
            ├─► Tier 1: Redis Mutex (SET key token NX PX 5000) ──► Fast Coordination (HTTP 409)
Request B ──┘                                                             │
                                                                          ▼
                                                       Tier 2: PostgreSQL SELECT ... FOR UPDATE
                                                               Strict ACID Row Lock & Isolation
```

### Tier 1: Distributed Redis Locking
- For every seat requested, the API attempts to acquire an atomic distributed lock via Redis:
  `SET seat-lock:{showId}:{seatId} {uuid} NX PX 5000`
- If acquiring multi-seat holds, all locks must succeed. If any seat lock fails, all previously acquired locks in the batch are atomically released via a Lua script (`releaseMultipleLocks`), shedding contention early with `409 Conflict`.

### Tier 2: PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)
- **Redis provides fast distributed coordination, while PostgreSQL row-level locking and transactional state transitions provide the authoritative correctness guarantee.**
- Inside a `ReadCommitted` transaction, the database executes:
  ```sql
  SELECT "id", "showId", "status", "holdExpiresAt"
  FROM "ShowSeat"
  WHERE "id" = ANY($1::text[])
  FOR UPDATE;
  ```
- The transaction asserts that every locked row satisfies `status == AVAILABLE` (or expired `HELD`). Only then are the rows updated to `HELD` and committed. Concurrent database transactions targeting the same rows block and re-evaluate the updated status upon acquiring the row lock, strictly preventing dual assignment.

---

## 3. Waitlist Auto-Assignment & FIFO Ordering

Waitlists are partitioned per `(showId, seatCategory)` and strictly **FIFO ordered by creation timestamp**.

```
Booking Cancellation ──► Lock Booking & ShowSeats ──► Status = CANCELLED
                                                             │
         ┌───────────────────────────────────────────────────┴───────────────────────────────────┐
         ▼ (If Waitlist Queue Has Entries)                                                       ▼ (If Queue Empty)
Find First WAITING Entry (FIFO: priority/createdAt ASC)                                 ShowSeat Status = AVAILABLE
Create WaitlistOffer (Status: PENDING, Secure Token, TTL: 900s)                         Broadcast WebSocket 'AVAILABLE'
ShowSeat Status = HELD, Schedule Offer Expiry Job
Dispatch Email with One-Click Claim Link
```

1. **Cancellation Trigger**: When a confirmed booking is cancelled, the transaction iterates through each released seat.
2. **Queue Evaluation**: The engine queries:
   ```sql
   SELECT * FROM "WaitlistEntry"
   WHERE "showId" = $1 AND "category" = $2 AND "status" = 'WAITING'
   ORDER BY "createdAt" ASC
   LIMIT 1 FOR UPDATE;
   ```
3. **Atomic Offer Generation**: If a customer exists:
   - `WaitlistEntry` transitions from `WAITING` to `OFFERED`.
   - A `WaitlistOffer` record is created containing a cryptographically random UUID token and `expiresAt = now() + WAITLIST_OFFER_TTL_SECONDS` (default 15m).
   - The `ShowSeat` is locked in `HELD` state for that customer.
   - An email notification with an actionable claim URL is sent.

---

## 4. Time-Limited Offer Handling & Cascading Expiry

When a waitlist offer is issued, a delayed job is registered in BullMQ (`waitlist-expiry-queue`).

```
Offer Expiry Job Fires ──► PostgreSQL Transaction ──► Offer Status == PENDING & Expired?
                                                                 │
      ┌──────────────────────────────────────────────────────────┴──────────────────────────────┐
      ▼ YES                                                                                     ▼ NO (Accepted/Cancelled)
Mark Offer = EXPIRED, Entry = EXPIRED                                                          No-Op (Safe Exit)
Find NEXT Customer in FIFO Queue for Category
      │
      ├─► Found: Issue New WaitlistOffer + Dispatch Email + Enqueue Next Expiry Job
      └─► Empty: Mark ShowSeat = AVAILABLE + Broadcast WebSocket 'AVAILABLE'
```

- **Race Safety**: If the customer accepts the offer concurrently as the expiry worker executes, PostgreSQL row-level locks serialize the transactions. Whichever commits first sets the state (`ACCEPTED` vs `EXPIRED`), ensuring the other operation fails gracefully without orphaned reservations or double bookings.
