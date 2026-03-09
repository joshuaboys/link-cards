# Obsidian Link Cards Plugin

| Field | Value |
|-------|-------|
| Status | Complete |
| Owner | @joshuaboys |
| Created | 2026-03-09 |

## Problem

There is no Obsidian plugin that saves links as visual cards with fetched metadata (title, description, image, favicon) and optionally enriches them with AI-generated summaries and tags. Users currently paste raw URLs or manually format link previews, which is tedious and produces inconsistent results.

## Success Criteria

- [x] `pnpm build` produces a valid `main.js` loadable by Obsidian (>= 1.0.0)
- [x] "Create Link Card" command fetches metadata from a URL and inserts a `linkcard` code block
- [x] `linkcard` code blocks render as styled cards with image, title, description, and favicon
- [x] "Summarize Link Card" command sends page content to a configured AI provider and appends TLDR, summary, and tags to the code block
- [x] Cards render correctly in both light and dark Obsidian themes
- [x] Plugin works with no AI provider configured (AI features are optional)

## Constraints

- Must use Obsidian's `requestUrl()` for all HTTP requests (CORS-free)
- No external runtime dependencies beyond what Obsidian provides (bundle everything via esbuild)
- Must follow Obsidian community plugin conventions (manifest.json, main.js, styles.css output)
- TypeScript with strict mode, targeting ES2018

## Modules

| Module | Purpose | Status | Dependencies |
|--------|---------|--------|--------------|
| [SCAFF](./modules/01-scaffold.aps.md) | Project config, build system, manifest | Complete | -- |
| [CORE](./modules/02-core.aps.md) | Settings, metadata fetching, card rendering, commands | Complete | SCAFF |
| [AI](./modules/03-ai.aps.md) | AI provider abstraction and summarize command | Complete | CORE |
| [STYLE](./modules/04-style.aps.md) | Card CSS styling for light/dark themes | Complete | CORE |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Open Graph tags missing or inconsistent across sites | Cards display with missing data | Fallback chain: OG tags -> HTML meta -> title tag -> URL as title |
| AI provider APIs change or rate-limit | Summarize command fails | Abstract provider interface; fail gracefully with user-facing notice |
| Obsidian API changes in future versions | Plugin breaks on update | Pin minAppVersion; use only stable documented APIs |
| CORS or network restrictions in some environments | Metadata fetch fails | Use Obsidian's requestUrl (already CORS-free); handle fetch errors gracefully |

## Open Questions

- [ ] Should the plugin cache fetched metadata to avoid re-fetching on every render?
- [ ] Should there be a ribbon icon or just command palette entries?

## Decisions

- **D-001:** Use `linkcard` as the code block language identifier -- *accepted*
- **D-002:** Store card data as YAML-like key-value pairs inside the code block -- *accepted*
- **D-003:** Support OpenAI, Anthropic, and GitHub Copilot as AI providers -- *accepted*
