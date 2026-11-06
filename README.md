# AI Form Client

A repo for tenant-specific `assets` and `scripts` required to use AI Form-Assist, delivered via Azure CDN.

## Tenant Scripts

Each tenant is a government service or ministry with its own form. Each tenant provides its own `src/tenant/<tenant>/scripts/` folder, which is uploaded to Azure Storage as-is — there is no build or bundling step. `client.js` in that folder is the entrypoint, loaded on the form page via `<script type="module" src="…/client.js">`; it can import other modules from the same folder using relative paths (e.g. a `guided-questions/` subfolder), and those get uploaded alongside it so the imports resolve at runtime. Local dev/test files (`*.html`) in `scripts/` are excluded from deployment.

## Tenant assets

In addition to the scripts, each tenant provides a set of assets that the AI backend reads at runtime from Azure Storage:

| Path | Purpose |
|---|---|
| `assets/agentprompts/` | System and user prompts for each AI agent (aggregator, dispatcher, conversation agent, form support agent) |
| `assets/formdefinitions/` | JSON files describing each form step — field IDs, types, titles, and descriptions used by the AI to understand the form |
| `assets/prompttemplates/` | Markdown templates that inject step-specific context into the AI's prompt for each form step |

Assets live in `src/tenant/<tenant>/assets/` and are uploaded separately from `scripts/` to the `assets` Azure Storage container (only reachable by Azure backend services).

## CI/CD

Two workflow files exist per tenant — a trigger wrapper and a shared reusable workflow:

- `.github/workflows/deploy-<tenant>.yml` — triggers on pushes to `dev`, `test`, or `main` that touch that tenant's files
- `.github/workflows/deploy-tenant-reusable.yml` — uploads that tenant's `scripts/` folder and assets to Azure Storage

Branch-to-environment mapping:

| Branch | GitHub environment | Azure subscription |
|---|---|---|
| `dev` | `dev` | dev |
| `test` | `test` | test |
| `main` | `prod` | prod |

Each GitHub environment must have these secrets:

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `STORAGE_ACCOUNT_NAME` | Target storage account name |

The workflows authenticate via Azure OIDC (no stored client secrets). The service principal for each environment needs a federated credential with subject `repo:<org>/ai-form-client:environment:<env>` and the **Storage Blob Data Contributor** role on the storage account.
