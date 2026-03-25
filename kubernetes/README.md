# Kubernetes Orchestration ☸️

This directory contains the declarative Kubernetes manifests to deploy the entire Capi application stack manually or via GitOps (ArgoCD/Flux/GitHub Actions).

## K8s Objects
- **`deployment.yml`:** High-availability definitions for Frontend, Backend, and Worker pods. Contains dynamic image placeholders targeted by our GitOps script.
- **`service.yml`:** Internal `ClusterIP` networking to route traffic reliably between pods while avoiding ephemeral IPs.
- **`ingress.yml`:** API Gateway bridging the cluster to the internet, pushing path-based routing (`/api` vs `/`) via an NGINX Ingress Controller.
- **`configmap.yml` & `secret.example.yml`:** Encrypted vault architecture passing credentials directly as environment variables avoiding hardcoded plaintext logic in deployments.
