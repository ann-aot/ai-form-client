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

## Tenant RAG documents

`src/tenant/<tenant>/rag/` holds the documents indexed by Azure AI Search for that tenant's RAG. Git is the source of truth; the documents are uploaded to the tenant's RAG storage container by the manual **Deploy RAG Documents** workflow, not by the automatic tenant deploy.

Removing a file from Git does **not** delete it from the container. To retire a document:

1. Remove it from `src/tenant/<tenant>/rag/`
2. Set blob metadata `IsDeleted=true` on the blob in the container
3. Run the indexer so the document is removed from the search index
4. Hard delete the blob from the container if needed

Remove it from Git first: re-deploying a file that is still in Git overwrites the blob and clears `IsDeleted`, which puts the document back in the index.

## CI/CD

Two workflow files exist per tenant — a trigger wrapper and a shared reusable workflow:

- `.github/workflows/deploy-<tenant>.yml` — triggers on pushes to `dev`, `test`, or `main` that touch that tenant's files (i.e. PR merges); the deploy job only runs in `bcgov/ai-form-client`, not in forks
- `.github/workflows/deploy-tenant-reusable.yml` — uploads that tenant's `scripts/` folder and assets to Azure Storage

Changes under `src/tenant/<tenant>/rag/` do not trigger these workflows. RAG documents are deployed manually with `.github/workflows/deploy-rag-docs.yml`: in GitHub Actions, choose **Deploy RAG Documents** → **Run workflow**, select the branch (`dev`, `test` or `main`) under "Use workflow from", select the tenant, and optionally tick **Dry run** to list what would be uploaded without uploading.

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
| `RAG_STORAGE_ACCOUNT_NAME` | Storage account holding the RAG document containers |
| `RAG_CONTAINER_WATER`, `RAG_CONTAINER_FISH`, `RAG_CONTAINER_FOI_DEMO`, `RAG_CONTAINER_CHEFS1` | RAG container name per tenant (only needed for tenants that are deployed) |

The workflows authenticate via Azure OIDC (no stored client secrets). The service principal for each environment needs a federated credential with subject `repo:<org>/ai-form-client:environment:<env>` and the **Storage Blob Data Contributor** role on the storage account (and on the RAG storage account). The RAG storage account must also allow network access from the workflow runner.
