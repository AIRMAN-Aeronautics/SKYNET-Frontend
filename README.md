# Skynet Frontend

React web application for the Airman Academy platform (staff/operations side).

## Stack
- **React 18** + **TypeScript** + **Vite**
- **TanStack Query v5** (server state)
- **React Router v6** (routing)
- **Tailwind CSS** + **shadcn-ui** (Radix primitives)
- **Axios** (HTTP client with JWT auto-refresh)
- **React Hook Form** + **Zod** (forms)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set VITE_API_BASE_URL to the Skynet Backend URL

# 3. Start dev server
npm run dev
```

App: http://localhost:5173

## UI Reference
Copy UI components from `../airman-academyplus/src/` as needed.
- shadcn-ui components: `src/components/ui/`
- Dispatch board: `src/components/dispatch/`
- Calendar: `src/components/calendar/`
- AI panels: `src/components/ai/`

See `ARCHITECTURE.md` in the workspace root for the full design document.
