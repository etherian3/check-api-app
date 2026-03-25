# Infrastructure as Code (IaC) 🛠️

This directory houses the foundational infrastructure scripts for deploying the Kubernetes (K3s) cluster on a bare-metal Proxmox homelab.

It is strictly split into two progressive phases:
1. **Terraform (`/terraform`):** Handles the Hardware/Hypervisor layer. Connects to the Proxmox API to clone and provision Ubuntu Cloud-Init VMs (Control Plane & Workers).
2. **Ansible (`/ansible`):** Handles the OS/Software layer. Installs K3s, handles intra-node communication, and configures Layer-2 Load Balancing via MetalLB.
