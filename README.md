# SAHAYAT — Emergency Safety Wearable

Independent production architecture:
- Frontend + Backend: Render
- Database: Supabase PostgreSQL (via Drizzle ORM & postgres-js)
- Email: Gmail SMTP
- Source control: GitHub

## Available Commands

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build`: build client assets and server bundle to `dist/`.
- `pnpm start`: start the production server with `node dist/index.js`.
- `pnpm check`: TypeScript validation across the codebase.
- `pnpm test`: run application test suite via Vitest.
- `pnpm security:audit`: verify no secrets or credentials are hardcoded.
- `pnpm db:migrate`: apply checked-in PostgreSQL migrations.
- `pnpm db:push`: generate and apply schema updates.

## Environment Variables

- `DATABASE_URL`: Supabase PostgreSQL connection string.
- `GMAIL_APP_PASSWORD`: Gmail App Password for SMTP transactional emails.
- `PORT`: Server listening port (default: 3000, provided automatically by Render).
- `NODE_ENV`: Set to `production` in deployment.
