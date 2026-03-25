# CI/CD Pipeline & GitOps 🤖

The `.github/workflows/cicd.yml` is the backbone of our automated integration and deployment lifecycle. It enforces a strict DevSecOps standard before updating infrastructure.

## Pipeline Stages
1. **Linting & Validation:** Verifies Next.js and Node.js best practices across the monorepo via `npm workspaces`.
2. **Security Scanning (Trivy):** Scans the locally built Docker images using Aqua Security's **Trivy**. Fails the pipeline execution if `CRITICAL` or `HIGH` OS vulnerabilities are found.
3. **Continuous Delivery:** Pushes the secured images to the Docker Hub registry using dynamic Git Run ID versioning instead of generic `:latest` tags.
4. **GitOps:** Mutates the `kubernetes/deployment.yml` tags inline via `sed` and commits them back to `main`. To prevent CI apocalypse (infinite loops), strict `paths-ignore` are defined for YAML and Terraform files.
