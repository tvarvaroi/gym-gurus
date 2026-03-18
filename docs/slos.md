# GymGurus Service Level Objectives

## Availability

- **Target**: 99.5% uptime (allows ~3.6 hours downtime/month)
- **Measured by**: Railway health checks on `/api/health`
- **Health check interval**: 30 seconds
- **Failure threshold**: 3 consecutive failures trigger auto-restart

## Latency

- **P95 API response**: < 500ms
- **P99 API response**: < 2000ms
- **Slow request threshold**: > 1000ms (logged automatically by requestLogger)

## Error Rate

- **Target**: < 1% 5xx error rate over any 24h window
- **Measured by**: Railway logs + error handler structured logging
- **Alert**: Manual log review (no automated alerting yet)

## Recovery Time

- **Target**: < 15 minutes to detect + respond to production incident
- **Alert**: Railway emails on service crash + auto-restart on health check failure

## Key User Journeys — Target Latency

| Journey                   | Target  | Notes                                            |
| ------------------------- | ------- | ------------------------------------------------ |
| Dashboard load            | < 800ms | Includes DB queries for stats, workouts, fatigue |
| Workout execution set log | < 300ms | Single INSERT, must feel instant                 |
| AI workout generation     | < 10s   | Anthropic Claude API dependent                   |
| Profile photo upload      | < 5s    | Background removal + S3 upload                   |
| Stripe checkout redirect  | < 2s    | Stripe session creation                          |
| Login / auth              | < 500ms | Session + DB lookup                              |
| Exercise history page     | < 600ms | JOIN through workoutSessions                     |

## Monitoring Stack

| Layer              | Tool                          | What it watches                                          |
| ------------------ | ----------------------------- | -------------------------------------------------------- |
| Application errors | Sentry                        | 5xx errors with full context (request ID, user ID, path) |
| Request logging    | requestLogger middleware      | All requests with timing, request IDs, slow detection    |
| Health checks      | Railway `/api/health`         | DB connectivity, uptime                                  |
| Security           | GitHub Actions (weekly)       | npm audit + TruffleHog secret scanning                   |
| Performance        | performanceMonitor middleware | Request counts per endpoint, slow request history        |

## Database SLOs

- **Connection pool**: Must sustain concurrent connections for peak load
- **Query latency**: P95 < 100ms for simple queries, P95 < 500ms for aggregations
- **Startup**: DB must be reachable within 10s of server start or process exits (production only)

## Stripe Webhook SLOs

- **Processing**: 100% idempotent delivery (DB-based deduplication)
- **Latency**: Webhook response < 5s (Stripe timeout is 20s)
- **Retry**: Return 500 on DB failure so Stripe retries automatically
