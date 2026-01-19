# Implementation Plan

## Purpose

Build a small service that caches Ethos vote stats in Redis on a 12-hour schedule
and exposes an internal API to read the cached data.

Source API:
`https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223`

## Data Flow

1. Scheduler triggers every 12 hours.
2. Fetch stats from Ethos API.
3. Store JSON in Redis with 12h TTL.
4. `GET /ethos/stats` returns cached data (fallback fetch on cache miss).

## Implementation Steps

1. Create `Dockerfile` and `docker-compose.yml` for local development.
2. Add Redis client and repository helpers (`get/set` JSON).
3. Implement Ethos stats service (fetch + cache).
4. Add scheduler job (cron or interval).
5. Add route/controller to return cached stats.
6. Add error handling and basic logging.

## Docker Compose (API + Redis)

Services:

- `redis` for cache.
- `api` for the Express app.

Env:

- `REDIS_URL=redis://redis:6379`
- `PORT=3000`

Ports:

- `api` exposes `3000:3000`.

## Required Packages

Runtime:

- `express`, `cors`, `helmet`, `dotenv`, `axios`, `ioredis`

Security:

- `express-rate-limit`, `hpp`

Validation:

- `zod`

Logging:

- `pino`, `pino-http`, `pino-pretty`

Dev/Test:

- `typescript`, `tsx`, `@types/*`, `eslint`, `prettier`
- `vitest`, `supertest`

## Local Configuration

Create `.env` with at least:

- `REDIS_URL`
- `PORT`
