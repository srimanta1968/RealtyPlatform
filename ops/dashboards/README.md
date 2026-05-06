# Dashboards

Grafana JSON exports + Metabase question definitions. Source-of-truth lives in
git so dashboard changes are reviewable.

- `lead-funnel.json` — daily lead → qualified → visit → converted
- `service-latency.json` — p50 / p95 / p99 per service
- `event-bus-lag.json` — consumer-group lag per stream
