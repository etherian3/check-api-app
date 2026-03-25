# Ansible Configuration Management 🎩

This directory contains the Ansible playbooks to transform raw Ubuntu servers spun up by Terraform into a fully functional lightweight Kubernetes (K3s) cluster.

## Playbook Workflow (`playbook.yml`)
1. **System Preparation:** Auto-updates APT packages and assigns standard hostnames (`k3s-master`, `k3s-worker`).
2. **Control Plane Installation:** Installs K3s Master and fetches the `node-token` programmatically.
3. **Worker Node Join:** Automatically joins worker nodes to the master using the extracted token dynamically across SSH sessions.
4. **MetalLB LoadBalancer:** Injects a Custom Resource (IPAddressPool `192.168.1.240-250` & L2Advertisement) directly into K8s so that NGINX Ingress can acquire a local static IP to interface with our homelab Router.
