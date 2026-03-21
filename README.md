# SimuSoul

SimuSoul is a **client-first Next.js app** for creating AI personas and chatting with them in long-running, memory-aware conversations.

It focuses on realism through:
- persona-specific communication styles and typing cadence
- persistent memory of major life events
- chat summarization + retrieval of relevant past conversations
- rich multimodal chat attachments (image/video/audio/document)
- local-first data ownership (IndexedDB in the browser)

---

## What the app does

### Core user journeys

1. **Create persona**
   - Manual form entry
   - AI-generated persona from a natural-language prompt
   - Clone a persona by analyzing exported chat text

2. **Chat with persona**
   - Persistent multi-chat sessions per persona
   - AI responses generated in message chunks with typing-delay simulation
   - Automatic title generation for new chats
   - Chat summaries generated incrementally for long-term recall

3. **Manage persona + memory**
   - Edit persona details and avatar
   - View/delete stored long-term memories
   - Delete chat(s) or entire persona

4. **Configure app**
   - Local user profile settings
   - Multiple Gemini API keys with failover
   - Full local data reset

---

## Routes

- `/` — Landing page + mandatory terms acknowledgment dialog (first run)
- `/personas` — Persona library with create/delete
- `/persona/new` — Persona creation (Manual / AI Generate / Clone Chat tabs)
- `/persona/[id]` — Main chat interface and persona management
- `/settings` — User details, API keys, data reset
- `/about` — Privacy policy, guidelines, disclaimer

---

## Realism and intelligence features

### 1) Persona identity + behavior shaping

Each persona stores:
- name, relation, optional age
- traits, backstory, goals
- response style
- min/max WPM (typing-speed bounds)
- long-term memories
- ignore-state metadata

These are used in the chat system prompt to keep behavior consistent and relational.

### 2) Time awareness

The AI receives dynamic time context from the last chat timestamp (minutes/hours/days/weeks/months/years) so re-engagement feels natural.

### 3) Long-term memory model (two-layer)

**A. Permanent memories (persona.memories)**
- Reserved for major user life events only (e.g., new job, move, marriage, baby, major health events).

**B. Chat summaries (per chat session)**
- Summaries are generated for chats with enough message volume.
- Existing summaries are incrementally updated as chats grow.

### 4) Agentic memory retrieval from past chats

Before responding, the app can:
1. decide whether retrieval is needed
2. generate search queries
3. rank relevant past chats
4. extract relevant message excerpts
5. inject retrieved context into the final prompt

This improves answers to “remember when…”, “what did we discuss…”, and similar prompts.

### 5) Typing realism

Assistant responses are split into 1–10 chunks and emitted with delays computed from persona WPM and message length, creating a texting-like rhythm.

### 6) Ignore-state behavior

If boundaries are repeatedly pushed, the model can set `shouldIgnore`.
The app then:
- marks the triggering user message as ignored
- stores ignore reason on persona
- persists this state across chats until reset conditions are met

---

## Persona creation modes

## 1) Manual

Fill name/relation (+ optional age), then provide traits, backstory, goals, and response style.
You can also auto-generate details from just name + relation.

## 2) AI Generate

Provide a prompt; AI returns full structured persona fields:
- name, relation, age
- traits, backstory, goals, response style
- minWpm/maxWpm

## 3) Clone Chat

Paste/upload chat export and target person name; AI infers:
- personality traits
- relation and likely age
- communication style, tone, values, quirks

Then those results are mapped into editable persona fields.

---

## Avatar generation + fallbacks

Default behavior:
- AI profile picture generation (Gemini image endpoint), then client-side compression.

If quota/rate limit blocks image generation, the UI provides fallback paths:
1. upload custom image
2. use deterministic initials-based placeholder avatar (SVG data URI)
3. copy generation prompt for use in external image tools and upload result

---

## Chat features

- Multiple chat sessions per persona
- Auto-create “New Chat” sessions
- Auto-cleanup of empty duplicate “New Chat” sessions
- Rename first-turn chat title with AI-generated short title
- Summarize chats as they mature
- Edit persona from chat screen
- Delete one chat or clear all chats
- Delete persona (cascades associated chats)

### Message UX

- Markdown + GFM rendering
- Syntax-highlighted code blocks
- One-click code copy
- Bubble sequencing styles for natural thread grouping
- Typing indicator with animated dots
- Ignored-message state indicator

### Attachments (multimodal)

Supported categories:
- images
- videos
- audio
- documents/text

Validation:
- max file size: **20MB**
- unsupported types are rejected

Attachments are embedded as base64 and passed to Gemini inline data parts.

### Media preview modal

- Image: wheel zoom, pinch zoom, drag pan, double-tap/click zoom toggle
- Video/audio: native controls
- Document: placeholder preview state
- Context menu suppression for media elements

---

## Safety and moderation

Moderation is applied during persona generation/editing.

Guardrails include:
- minimum age constraints
- rejection of explicit unsafe or prohibited content classes
- content-boundary prompting for non-test mode

Chat prompt policy adds deflection behavior for forbidden topics and escalation path that can end in ignore-state.

### Test mode

If all stored API keys end with `_TEST_MODE_360`, the app enters test mode:
- moderation relaxes/short-circuits in multiple flows
- Gemini safety thresholds are lowered/disabled in relevant calls

---

## Data model and storage

All primary app data is stored in browser IndexedDB (`idb` wrapper):
- `personas`
- `chats` (indexed by `personaId`)
- `userDetails`
- `apiKeys`

Notable details:
- DB name: `SimuSoulDB`
- schema version includes migration from legacy persona-embedded chats to separate `chats` store
- deleting persona removes related chats
- “clear all data” deletes DB and reloads app

No backend database is required for core usage.

---

## API key management and failover

Users enter Gemini API keys in Settings (up to 5).

Request strategy:
- keys are used in round-robin order
- if one key fails, next key is attempted
- 503 responses are retried with exponential backoff

If no keys are configured, features requiring AI return a clear setup error.

---

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** React 18, Tailwind CSS, Radix UI, Lucide icons
- **Theming:** `next-themes` (dark default)
- **Storage:** IndexedDB via `idb`
- **AI/validation:** Google Gemini API + `zod`
- **Markdown/code rendering:** `react-markdown`, `remark-gfm`, `react-syntax-highlighter`, `prismjs`

---

## Project scripts

From `package.json`:

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — lint
- `npm run typecheck` — TypeScript checks (`tsc --noEmit`)

---

## Local development

1. Install dependencies
```bash
npm ci
```

2. Run dev server
```bash
npm run dev
```

3. Open:
```text
http://localhost:3000
```

Then:
- add at least one Gemini API key in **Settings**
- accept terms on first launch
- create your first persona

---

## Known constraints

- API keys are stored locally in browser DB (not encrypted by a backend KMS).
- Attachments are base64 in IndexedDB, increasing storage footprint.
- Build currently skips type/lint checks via `next.config.ts` (`ignoreBuildErrors`, `ignoreDuringBuilds`).
- There is currently no automated unit/integration/e2e test suite in the repo.

---

## Repository notes

- Legacy planning blueprint exists at `docs/blueprint.md` (initial concept).  
  Current implementation behavior is defined by the code under `src/`.
