# Express API

## Project Logic
This service fetches Ethos vote stats from an external API, stores them in Redis,
and serves the cached data via an internal endpoint.

Source API:
`https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223`

## Data Flow
1. A scheduled job runs every 12 hours.
2. It requests stats from the Ethos API.
3. The response is cached in Redis with a 12-hour TTL.
4. The API endpoint returns the cached data (fallback fetch on cache miss).

## API Endpoint
- `GET /ethos/stats` → returns cached stats JSON.

## Schedule
- 12 hours (cron or interval, depending on implementation).

## Configuration
- `REDIS_URL` — Redis connection string.
