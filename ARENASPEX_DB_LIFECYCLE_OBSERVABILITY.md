# ArenaSPEX Database Lifecycle Observability

## Purpose

This telemetry was introduced after seven production Prisma engine messages reported a
closed PostgreSQL connection. Six occurred in one 2.49 ms cluster and one occurred later.
Both followed Render instance starts. Lifecycle correlation is currently **LIKELY**, but
there is no proven application connection defect, failed write, transaction failure, or
sustained database outage.

The telemetry is diagnostic only. It does not change Prisma, retry, pooling, transaction,
database endpoint, or shutdown behavior and does not persist telemetry.

## Events

- `db.lifecycle.instance_start`
- `db.lifecycle.instance_shutdown`
- `db.prisma.retry_started`
- `db.prisma.retry_succeeded`
- `db.prisma.retry_failed`
- `db.prisma.disconnect_started`
- `db.prisma.disconnect_completed`
- `db.prisma.disconnect_failed`
- `db.probe.success`
- `db.probe.failure`

## Safe fields

Events use a strict field set: timestamp, process ID, process uptime, environment, signal,
retry attempt, error class, safe error code, and Render service/instance/Git identifiers
when those documented runtime values are available. Error messages and SQL are excluded.

Forbidden fields include database URLs, connection strings, passwords, tokens, API keys,
raw environment dumps, SQL, and application or user content.

## Interpretation

Correlate the process and uptime fields across instance start, signal, retry, disconnect,
probe, and raw Prisma messages. A close around confirmed instance replacement alone is not
evidence that an application hotfix is required. Absence of an application disconnect event
helps distinguish an engine/provider close from the existing retry-controlled disconnect.

## Escalation criteria

Consider a connection hotfix only when telemetry demonstrates one or more of:

- repeated independent close clusters during a stable instance lifetime;
- closes immediately following `db.prisma.disconnect_started`;
- repeated probe failures without lifecycle events;
- Prisma P100x or other connectivity errors;
- failed writes, transaction failures, or rollback failures;
- a crash/retry loop; or
- sustained user-facing availability impact.

Observe production for 24–48 hours after deployment, then compare any connection-close
messages with the structured events before changing connection behavior.
