# Helm Charts

One chart per service / BFF / agent. Per-chart layout (per `docs/Project-Structure.md` §12):

```
infra/helm/<service>/
├── Chart.yaml
├── values.yaml
├── values.staging.yaml
├── values.production.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml
    ├── pdb.yaml
    ├── servicemonitor.yaml
    ├── pre-deploy-job.yaml   # runs DB migration before rollout
    └── networkpolicy.yaml
```

Charts land alongside the first production deploy.
