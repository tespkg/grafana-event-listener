# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this plugin is

A **Grafana panel plugin** (`type: "panel"`, id `event-listener-panel`) that acts as a
two-way `postMessage` bridge between a Grafana dashboard embedded in an iframe and the
parent window hosting it. The panel renders nothing visible (`<div style={{ display: 'none' }}>`);
its entire job is the side effects set up in a single `useEffect`.

Note: `README.md` is leftover `@grafana/create-plugin` scaffolding describing a "Scenes app"
template. It does **not** match this repo — the real plugin is the single panel in `src/module.tsx`.
The `@grafana/scenes`/`react-router-dom` dependencies are unused scaffolding leftovers. Trust the
code, not the README, for architecture.

## Architecture

Everything lives in `src/module.tsx`. The bridge has two directions:

**Parent → Grafana** (`window.addEventListener('message')` → `handleMessage`):
- `{ type: 'setVariable', variables }` → `setGrafanaVariables` writes variables into the URL.
- `{ type: 'navigate', path, variables }` → `navigateToPath` does SPA-style routing.

Both mutate the URL via `history.pushState` then dispatch a synthetic `PopStateEvent('popstate')`
so Grafana's router/variable system reacts without a full page reload.

**Grafana → Parent** (`window.parent.postMessage`):
- `{ type: 'grafanaPanelReady' }` on mount.
- `{ type: 'variableChanged', variables }` whenever the URL/variables change.
- `{ type: 'logout', reason: 'sessionExpired' }` when any `fetch`/XHR returns HTTP 401.

### Key mechanisms (the parts that need reading multiple functions to understand)

- **Variable ↔ URL encoding** (`applyVariablesToParams` / `getCurrentVariables`): Grafana
  template variables live in the URL as `var-<name>` query params. The exception is the time
  range keys in `TIME_RANGE_KEYS` (`from`, `to`), which Grafana stores **unprefixed**. Both
  functions branch on this set. Multi-value variables are encoded as repeated params and
  represented as JS arrays.

- **Change detection is redundant by design** — Grafana updates the URL through several paths,
  so the plugin monkey-patches `history.pushState`/`replaceState`, listens for
  `popstate`/`hashchange`, AND runs a 500ms polling `setInterval` fallback. All routes funnel
  into `handleLocationChange` → `notifyParentOfVariables`.

- **Echo-loop prevention** (`isSettingFromParent`): when the parent initiates a change, this
  flag suppresses `notifyParentOfVariables` so the change isn't reported straight back to the
  parent. `setGrafanaVariables`/`navigateToPath` also resync `lastUrl`/`lastVariables` to keep
  the poller from re-detecting their own change.

- **401 detection**: `window.fetch` and `XMLHttpRequest.prototype.open/send` are wrapped to
  watch for 401 responses.

- **Cleanup**: the `useEffect` return restores every monkey-patched global (`fetch`, XHR
  methods, history methods), removes listeners, and clears the polling interval. Any new global
  patch MUST be undone here.

## Commands

```bash
npm run dev        # webpack watch build (development) -> dist/
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run lint:fix   # eslint --fix + prettier --write
npm run test       # jest --watch --onlyChanged (requires git init)
npm run test:ci    # jest once, --passWithNoTests
npm run e2e        # playwright (run `npm run server` first)
npm run server     # docker compose: Grafana instance with this plugin loaded
npm run sign       # sign plugin via @grafana/sign-plugin
```

Run a single Jest test: `npm run test:ci -- -t "test name"` or `npm run test:ci -- path/to/file.test.ts`.

There are currently no `*.test.ts` unit tests; `tests/` holds Playwright `fixtures.ts` only.

## Conventions

- Node >= 22 (`.nvmrc`). Build toolchain is webpack + SWC, configured under `.config/`
  (do not hand-edit `.config/` unless intentionally diverging from the scaffold).
- Releasing: bump `version` in `package.json` AND `src/plugin.json` (they currently drift —
  package is `0.0.8`, plugin.json is `0.0.3`), then push a version tag to trigger the release
  workflow. Recent commit history shows version bumps are done as explicit commits.
- `postMessage` calls use `'*'` as target origin — keep this in mind for any security-related changes.
