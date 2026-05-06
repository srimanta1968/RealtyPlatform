# Terraform

Cloud infrastructure (RDS, S3, CDN, Kubernetes cluster, IAM, secrets).

Per `docs/Project-Structure.md` §11–12, the Phase 1 footprint is one managed
PostgreSQL cluster (~10 logical DBs), one Redis instance, one S3 bucket per
environment, and one Kubernetes cluster (managed: EKS / GKE).

Stand-up tasks land in a follow-up infra sprint.
