# Shared Dockerfiles

Per-service Dockerfiles live alongside the service code (e.g. `services/user-service/Dockerfile`).
This folder holds **shared base images** so every service inherits the same
Node + pnpm runtime configuration.

Phase 1 ships only the per-service Dockerfile pattern; a shared base image is
introduced once we have ≥3 services in production.
