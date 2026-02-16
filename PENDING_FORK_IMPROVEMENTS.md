# Pending Fork Improvements

<!-- FORMAT NOTES (for future sessions):
  - Each ## heading is one queued improvement. The /improve-next skill picks the FIRST one.
  - Do NOT number the headings — items get removed after implementation and renumbering is tedious.
  - Keep bullet points actionable with file paths and specific observations.
  - After implementing, remove the completed ## section and append a summary to FORK_IMPROVEMENTS.md.
-->

## Performance: Rendering Pipeline

The dashboard becomes laggy under real multi-agent load. Root causes are unvirtualized lists, redundant polling, and O(n) operations on every event.

- **Virtualize the event list:** `EventTimeline` renders all 300 max events as DOM nodes via `filteredEvents.map()`. Each `Card.Root` has 6+ child elements = 1800+ DOM nodes in the scroll container. Combined with `animation: "eventEnter 0.3s ease"` on every card, each new event triggers layout across all cards. Replace with `@tanstack/react-virtual` or `react-window` to render only ~30 visible rows.
- **Eliminate chart polling, use WebSocket-driven data:** `useChartData.ts` polls `/api/chart-data` every 2 seconds via `setInterval`. Each poll triggers fetch → state update → full Recharts re-render. Meanwhile the WebSocket delivers individual events that also re-render. The chart re-renders 30x/minute from polling alone. Compute chart buckets client-side from the existing WebSocket event array instead.
- **Set-based event dedup:** `useWebSocket.ts` eventReducer runs `state.events.some((e) => e.id === action.event.id)` on every new event — O(n) scan with n up to 300. Replace with a `Set<string>` of IDs maintained alongside the events array for O(1) lookup.
- **Pre-filter events per swim lane:** Each `AgentSwimLane` receives the full `events[]` array. When any event arrives, every open swim lane re-runs its `useEffect` iterating all events. With 300 events and 3 lanes = 900 iterations per event. `AgentSwimLaneContainer` should `useMemo` per-agent filtered events and pass only those down.
- **Bundle size:** Single 1.1MB JS chunk. Add `build.rollupOptions.output.manualChunks` to split Recharts and Chakra into separate vendor chunks.

## Project/Codebase Scoping

The single biggest structural gap. All agents from all projects dump into one undifferentiated stream with no way to separate them.

- **Extract `cwd` / project root from hook events:** The hook context has the working directory available. `send_event.py` should include `cwd` (or a derived project root) in every event payload. Add a `project` or `cwd` field to the `HookEvent` type.
- **Group agents by project:** Agents from the same codebase (same `cwd`) should be visually grouped. Agent team workers all share a project root — that's the natural grouping key.
- **Add project-level scope filter:** Either a sidebar listing discovered projects or a top-level dropdown/tabs that scopes the entire dashboard (chart, event stream, swim lanes) to one project. This should be the primary navigation, not buried in the filter panel.
- **Persist scope across reloads:** Selected project filter should survive page reload via URL search params or localStorage.

## Swim Lane → Agent Timeline Redesign

What the dashboard calls "swim lanes" are individual agent bar charts you manually toggle. They don't show inter-agent relationships, timing overlap, or coordination — the entire point of multi-agent observability.

- **Replace per-agent bar charts with a shared-axis horizontal timeline:** Show agent activity spans on a shared time axis (Gantt-style). Each agent gets a horizontal row. Active periods are colored blocks, tool calls are tick marks, idle gaps are visible whitespace. This makes concurrency and sequencing visible at a glance.
- **Auto-populate from project scope:** When scoped to a project, all agents in that project should appear as timeline rows automatically — no manual toggling needed.
- **Show agent status at-a-glance:** Each timeline row should show current state (active / idle / completed / error) without requiring the user to read stat badges.
- **Remove duplicate stat badges:** The main chart shows 4 stat badges, each swim lane shows 6. With 3 lanes open that's 22 numbers on screen. The timeline redesign should consolidate this to a single summary bar.

## Visual Design System

The UI has no unifying visual language — gradients, shadows, border radii, and icons are applied inconsistently across components.

- **Flatten gradients:** Header, chart section, event cards, time range buttons, tooltips, and badges all use distinct gradients (6+ applications in one viewport). Keep the header gradient; make everything else flat backgrounds. Gradients should signal hierarchy — when everything is gradient, nothing is.
- **Reduce shadow levels to 2-3:** Event cards (`shadow="lg"`), badges inside cards (`shadow="md"`, `shadow="sm"`), buttons (`shadow="lg"`), header (`shadow="lg"`), chart section (`boxShadow="lg"`), timeline header (`boxShadow="0 4px 20px..."`). Five+ layers of competing shadows create visual mud. Use: no shadow (inline), subtle shadow (cards), strong shadow (modals/overlays).
- **Replace emoji with consistent icon set:** 20+ emoji used as functional icons. Emoji render differently cross-platform, have inconsistent optical weights, and lack precision. Use Lucide, Phosphor, or similar.
- **Reduce badge count per event row:** Each event card shows up to 6 badges (source_app, session_id, model, event_type, tool_name, time). Reduce to 3: event type + tool name (combined), contextual detail, and timestamp. Source/session are redundant when scoped to a project.
- **Unify border radius:** Codebase uses `"lg"`, `"full"`, `"md"`, `"3px"`, `"3px 0 0 3px"` across components. Pick 2 values (e.g., `md` for cards/inputs, `full` for status dots/avatars) and use them consistently.
- **Simplify background layers:** 4 semantic backgrounds (`bg-primary` through `bg-quaternary`) plus gradient combinations create a patchwork. Reduce to 2: canvas background and card/surface background.

## Information Architecture & UX

The dashboard doesn't answer the three questions a monitoring user has: *Is it working? What's happening? Is anything stuck?*

- **Surface filters as primary UI:** The FilterPanel is hidden behind a chart icon button with no affordance that filters exist. For a monitoring tool, filtering is a primary action. Always-visible filter bar or segmented controls at the top.
- **Clarify agent tag interaction:** Agent tags above the event stream (clickable, open swim lanes) look similar to agent badges inside event cards (not clickable, decorative). Two visual representations of the same concept with different behaviors. Differentiate or unify.
- **Add agent presence/status indicators:** The user needs to see at a glance whether agents are active, idle, or errored. Currently requires noticing the absence of new events — the UI provides no affordance for this. Add simple status dots or activity indicators per agent.
- **Improve empty states:** EventTimeline and chart show minimal empty states. Add contextual guidance (e.g., "Waiting for events... run `just setup /path/to/project` to connect an agent") with setup instructions.
- **Filter persistence:** Filters reset on page reload. Persist active filters + time range in URL search params or localStorage.
- **Filter icon mismatch:** The filter toggle uses a chart emoji icon. Use a filter/funnel icon instead.

## Code Quality & DRY

Duplicated utilities, inconsistent patterns, and maintenance-risk code structures.

- **Extract shared utilities:** `formatModelName` is duplicated in `AgentSwimLane.tsx:30` and `EventRow.tsx:18`. `formatGap` is duplicated in `LivePulseChart.tsx:25` and `AgentSwimLane.tsx:24`. `getDominantSessionColor` is duplicated in both chart components. Move all to `utils/`.
- **Consolidate agent identity derivation:** LivePulseChart derives agents from `dataPoints[].sessions` (server-aggregated, 8-char truncated). EventTimeline gets agents from raw `event.source_app` + `event.session_id`. Swim lanes split on `:` to decompose. Three different derivation paths for the same concept — mismatch in any breaks the mapping. Define one canonical `AgentId` type and derive it in one place.
- **Eliminate EventRow mobile/desktop duplication:** EventRow has two complete layout blocks toggled by `display={{ base: "block", md: "none" }}` and `display={{ base: "none", md: "flex" }}`. This doubles component complexity and creates maintenance risk. Use responsive props on a single layout instead.
- **Unify button patterns:** Swim lane close uses `Box as="button"`, header uses `IconButton`, HITL cards use `Button`, agent tags use `Box as="button"`. Standardize on Chakra `Button` or `IconButton` for all interactive elements.
- **Tighten `ChatItem` types:** Fields are mostly optional — tighten the types once server-side chat format is documented.
- **Accessibility:** Run an axe audit. Known gaps: chart components lack ARIA labels, color-only status indicators (connection dot) need text alternatives.

## Theme System

- **Theme creator color picker:** The `ThemeManager` dialog has full CRUD for custom themes but no color picker — just raw hex input. Add a color picker component.
