# Architecture Review — CR-20260310

## Module Structure

```
src/
├── main.ts              Plugin lifecycle, commands, editor helpers
├── settings.ts          Settings interface, defaults, settings tab UI
├── card-renderer.ts     Code block parser + DOM renderer
├── metadata-fetcher.ts  URL → metadata extraction (OG tags, HTML)
└── ai-provider.ts       AI provider abstraction (OpenAI, Anthropic, Copilot)
```

## Dependency Graph

```
main.ts
├── settings.ts          (types, defaults, settings tab)
├── card-renderer.ts     (registered as code block processor)
├── metadata-fetcher.ts  (used by both commands)
└── ai-provider.ts       (used by summarize command)

card-renderer.ts         (standalone — no internal deps)
metadata-fetcher.ts      (standalone — no internal deps)
ai-provider.ts
└── settings.ts          (imports LinkCardsSettings type)
```

### Assessment

The dependency graph is clean and acyclic. Each module has a single responsibility. There are no circular imports. This is a well-factored architecture for a plugin of this size.

## Data Flow

### Create Link Card Command

```
User action (selection/clipboard)
  → looksLikeUrl() validation
  → fetchMetadata(url)
    → requestUrl() → HTML
    → regex extraction of OG/meta tags
    → CardMetadata object
  → format as linkcard code block
  → editor.replaceRange() insertion
```

### Render Link Card (Reading View)

```
Obsidian detects ```linkcard code block
  → renderCard(source, el, ctx)
    → parseCardBlock(source) → CardData
    → DOM construction via createEl/createDiv
    → click handler for window.open()
```

### Summarize Link Card Command

```
User places cursor inside linkcard block
  → findLinkcardBlock() locates block boundaries
  → extract URL from block content
  → fetchMetadata(url) again (re-fetches)
  → summarizeContent(title+desc, settings)
    → dispatch to callOpenAi/callAnthropic/callCopilot
    → parseYamlResponse() → AiResult
  → upsertField() for tldr, summary, tags
  → editor.replaceRange() to update block
```

## Strengths

1. **Single-responsibility modules** — Each file has a clear, focused purpose with minimal coupling.

2. **Obsidian API integration** — Proper use of `Plugin` lifecycle, `registerMarkdownCodeBlockProcessor`, `addCommand`, `PluginSettingTab`, and `requestUrl`. Follows Obsidian plugin conventions.

3. **Provider abstraction** — The AI provider layer cleanly separates API-specific logic from the command logic. Adding a new provider requires only a new function and a switch case.

4. **Metadata fallback chain** — The fetcher uses a sensible priority: OG tags → HTML meta → `<title>` element → URL itself. Each extraction handles both attribute orderings.

5. **Flat data format** — The linkcard block format (`key: value` per line) is human-readable, editable, and version-control friendly.

## Weaknesses

1. **No data validation layer** — Raw strings flow from external sources (HTML, APIs) directly to storage and rendering without a validation/sanitization boundary.

2. **No error abstraction** — Errors bubble up as raw exceptions. A consistent error type or error-handling middleware would improve UX and debugging.

3. **Redundant metadata fetch** — The summarize command re-fetches metadata to extract title/description even though the linkcard block already contains this data. It could read from the block directly.

4. **No caching** — Each "Create" command fetches metadata from scratch. Frequently-used URLs could benefit from a simple in-memory cache.

5. **Code duplication in AI providers** — `callOpenAi` and `callCopilot` share the same request/response shape. A shared implementation would reduce duplication and ensure consistent behavior.

## Configuration Review

### tsconfig.json

| Setting | Value | Assessment |
|---|---|---|
| `target` | ES2018 | Conservative but safe for Obsidian compatibility |
| `module` | ESNext | Correct for esbuild bundling |
| `strictNullChecks` | true | Good |
| `noImplicitAny` | true | Good |
| `strict` | not set | Should be enabled for full type safety |
| `allowJs` | true | Unnecessary for a pure TS project |
| `lib` | DOM, ES5-ES7 | Could use `ESNext` instead of listing versions |

### esbuild.config.mjs

The build config is standard for Obsidian plugins. External list covers all known Obsidian/electron/CodeMirror modules. Tree-shaking is enabled. Watch mode works for development.

### package.json

- `"obsidian": "latest"` should be pinned to a version range
- No `lint` or `test` scripts defined
- No pre-commit hooks or CI configuration

### manifest.json

- `"isDesktopOnly": false` — correct, the plugin uses `requestUrl` (works on mobile) and `navigator.clipboard` (may not work on mobile)
- `"minAppVersion": "1.0.0"` — should be verified against the actual minimum API version used

## Scalability Considerations

The current architecture supports the feature set well. If the plugin grows, consider:

- **Plugin state management** — Currently stateless between commands. If caching or queuing is added, a central state object would be needed.
- **Content extraction** — Moving from regex-based HTML parsing to a streaming approach for large pages.
- **Rate limiting** — AI API calls have no rate limiting or queuing. Rapid consecutive calls could hit API limits.
