# Terraform Provisioning 🌍

Automated Virtual Machine (VM) deployment utilizing the `Telmate/proxmox` provider.

## How to execute
1. Duplicate `terraform.example.tfvars` to `terraform.tfvars`.
2. Fill in your secure Proxmox API Token and Secret.
3. Execute `terraform init` to download the provider plugins.
4. Execute `terraform plan` to preview the upcoming Cloud-Init cloned nodes.
5. Execute `terraform apply -auto-approve` to instruct Proxmox to build the VMs from scratch.

*Note: Make sure your target Proxmox Node already contains the matched Ubuntu Cloud-Init template (`VM 9002` by default).*
