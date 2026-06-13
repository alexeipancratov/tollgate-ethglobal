# Running Tollgate (walking-skeleton scaffold)

Prerequisites: Node.js 20+ and a Chromium browser (Chrome/Edge/Brave).

```bash
npm install
```

Then run three processes (separate terminals):

```bash
npm run be:server   # Fastify gate: POST /clearance + WS /feed on http://127.0.0.1:8787
npm run web         # Vite console (open the printed localhost URL in Chromium)
npm run be:agent    # Agent loop: generates mocked priced actions, asks the gate
```

Open the console URL; you should see mocked priced actions streaming in, each
"auto-approved", updating live. Open a second tab mid-run to see the late-joiner
snapshot. Stop/restart `be:server` to confirm history persists.

## Checks

```bash
npm test        # Vitest: pure policy unit test + clearance endpoint check
npm run typecheck   # TypeScript strict across shared/, be/, web/
```

See `specs/001-scaffold-walking-skeleton/quickstart.md` for the full validation
table mapped to the success criteria.

## Config (env vars)

- `PORT` (default 8787), `HOST` (default 127.0.0.1), `TOLLGATE_DB` (default `be/data/tollgate.db`)
- Agent: `GATE_URL`, `AGENT_INTERVAL_MS` (default 1200)
