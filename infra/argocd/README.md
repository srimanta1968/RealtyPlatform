# Argo CD — GitOps

Application + ApplicationSet definitions live here. Argo CD watches the `main`
branch; CI updates `infra/argocd/<env>/<service>.yaml` with the new image SHA
and Argo rolls out within minutes.

Phase 1 spec only — manifests follow once the K8s cluster exists.
