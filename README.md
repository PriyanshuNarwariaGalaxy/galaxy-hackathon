
## Requirements
- **Node.js**: 18+ (recommended 20+)
- **Postgres** database
- **Trigger.dev** project (Trigger Cloud or self-hosted)

## Install

```bash
npm install
```

## Environment variables

Create a local environment file (example `.env.local`) and set:

- **DATABASE_URL**: Postgres connection string (required for UI + run persistence)
- **TRIGGER_SECRET_KEY**: Trigger.dev secret key (required to trigger tasks from the app)
- **TRIGGER_PROJECT_ID**: Trigger.dev project ref (required for `trigger:dev` and task indexing)
- **TRIGGER_API_URL**: (optional) only if self-hosting Trigger; omit for Trigger Cloud

Optional:
- **FAL_MOCK_MODE**: set to `1` to auto-complete fal wait tokens for local testing (no external fal calls)

## Database setup (Prisma)

Run migrations and generate Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

## Run the app (Next.js)

```bash
npm run dev
```

Open `http://localhost:3000`.

## Run the Trigger.dev dev worker (required for executions to leave QUEUED)

In a second terminal:

```bash
TRIGGER_PROJECT_ID=proj_... npm run trigger:dev
```

If you see “Project not found”, your project ref is wrong or you’re using the wrong Trigger CLI profile.

## How to use

### Dashboard
- Visit `/` to see workflows
- Create a new workflow via **New workflow**

### Editor
- Visit `/workflows/new` or open an existing workflow
- Drag/drop nodes from the sidebar onto the canvas
- Connect nodes via handles
- **Save** (manual) or rely on autosave
- **Run** starts a `WorkflowRun` and triggers the orchestrator task

### Execution UX
- The right sidebar shows:
  - run history (filterable by status)
  - run inspector (summary + node list + node details)
  - cancel button for RUNNING/WAITING runs
- Execution state is a **read-only overlay** and is **not persisted into the workflow graph**

## Local execution testing (recommended)

To test runs without external provider calls:

```bash
FAL_MOCK_MODE=1 npm run dev
```

And run the Trigger worker:

```bash
FAL_MOCK_MODE=1 TRIGGER_PROJECT_ID=proj_... npm run trigger:dev
```

## Useful scripts
- **typecheck**: `npm run typecheck`
- **trigger dev worker**: `npm run trigger:dev`
- **prisma migrate**: `npm run db:migrate`
- **prisma generate**: `npm run db:generate`
