# Core Plugin

| ID | Owner | Status |
|----|-------|--------|
| CORE | @joshuaboys | Complete |

## Purpose

Implement the core plugin functionality: settings management, URL metadata fetching (Open Graph / HTML meta), card rendering via a code block processor, and the "Create Link Card" command.

## In Scope

- Plugin settings interface and settings tab UI
- Metadata fetcher using Obsidian's `requestUrl()`
- Code block processor that renders `linkcard` blocks as visual cards
- "Create Link Card" command (clipboard/selection -> fetch metadata -> insert code block)
- Plugin lifecycle (onload/onunload)

## Out of Scope

- AI summarization (AI module)
- Card visual styling beyond structural HTML (STYLE module)
- "Summarize Link Card" command (AI module)

## Interfaces

**Depends on:**

- SCAFF -- build system and project config

**Exposes:**

- Settings interface (consumed by AI module for provider config)
- Metadata fetcher (consumed by AI module for page content extraction)
- Card code block format (consumed by STYLE module for CSS targeting)

## Ready Checklist

- [x] Purpose and scope are clear
- [x] Dependencies identified
- [x] At least one task defined

## Tasks

### CORE-001: Implement plugin settings

- **Status:** Complete (2026-03-09)
- **Intent:** Allow users to configure the plugin through Obsidian's settings UI
- **Expected Outcome:** A settings tab appears under Obsidian plugin settings with fields for AI provider selection, API key, model name, and Copilot endpoint; settings persist across sessions
- **Validation:** `pnpm build` (settings module compiles without errors)
- **Dependencies:** SCAFF-001
- **Confidence:** high

### CORE-002: Implement metadata fetcher

- **Status:** Complete (2026-03-09)
- **Intent:** Extract Open Graph and HTML metadata from any URL
- **Expected Outcome:** Given a URL, the fetcher returns a structured object with title, description, image, favicon, and site name -- falling back through OG tags, HTML meta tags, and title element
- **Validation:** `pnpm build` (metadata fetcher compiles without errors)
- **Dependencies:** SCAFF-001
- **Confidence:** high

### CORE-003: Implement card renderer

- **Status:** Complete (2026-03-09)
- **Intent:** Render `linkcard` code blocks as visual card elements in Obsidian's reading view
- **Expected Outcome:** A registered code block processor parses YAML-like content from `linkcard` blocks and builds an HTML card with image, favicon, title, description, and optional TLDR/tags sections
- **Validation:** `pnpm build` (card renderer compiles without errors)
- **Dependencies:** SCAFF-001
- **Confidence:** high

### CORE-004: Implement "Create Link Card" command and wire up main.ts

- **Status:** Complete (2026-03-09)
- **Intent:** Give users a single command to turn a URL into a rendered link card
- **Expected Outcome:** The "Create Link Card" command reads a URL from clipboard or editor selection, fetches metadata, and inserts a populated `linkcard` code block at the cursor position; plugin registers all components on load
- **Validation:** `pnpm build` (full plugin compiles and produces main.js)
- **Dependencies:** CORE-001, CORE-002, CORE-003
- **Confidence:** high
