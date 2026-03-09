# Obsidian Link Cards Plugin - Implementation Plan

## Context

The user wants an Obsidian plugin that saves links as visual "cards" with metadata (title, description, image, favicon), and optionally runs AI over the linked content to generate a TLDR, summary, and topic tags. This is a greenfield project - the repo is empty aside from a README and .gitignore.

## Plugin Overview

**Name:** `obsidian-link-cards`
**Approach:** Single plugin with two features: (1) link card rendering (core), (2) AI summarization/tagging (optional enhancement)

## File Structure

```
obsidian-link-cards/
├── src/
│   ├── main.ts                # Plugin entry point, command registration
│   ├── settings.ts            # PluginSettingTab + settings interface
│   ├── card-renderer.ts       # registerMarkdownCodeBlockProcessor for "linkcard"
│   ├── metadata-fetcher.ts    # Fetch Open Graph / HTML meta tags via requestUrl
│   └── ai-provider.ts         # AI provider abstraction (OpenAI, Anthropic, Ollama)
├── styles.css                 # Card styling
├── manifest.json              # Obsidian plugin manifest
├── package.json               # Dependencies + build scripts
├── tsconfig.json              # TypeScript config
├── esbuild.config.mjs         # Build configuration
└── .gitignore                 # node_modules, main.js, etc.
```

## Step-by-step Implementation

### Step 1: Project scaffolding
Create all config files based on the official Obsidian sample plugin:
- `manifest.json` - plugin ID `obsidian-link-cards`, minAppVersion `1.0.0`
- `package.json` - deps: `obsidian`, `@types/node`, `typescript`, `esbuild`, `builtin-modules`
- `tsconfig.json` - target ES2018, module ESNext, strict mode
- `esbuild.config.mjs` - standard Obsidian esbuild config (watch mode + production build)
- Update `.gitignore` for node_modules, main.js, data.json

### Step 2: Settings (`src/settings.ts`)
Define settings interface and `PluginSettingTab`:
```typescript
interface LinkCardsSettings {
  aiProvider: 'none' | 'openai' | 'anthropic' | 'copilot';
  apiKey: string;
  modelName: string;
  copilotEndpoint: string;  // GitHub Copilot API endpoint
  defaultTags: string[];
}
```
Settings tab with dropdown for AI provider, text fields for API key, model name, and Copilot endpoint.

### Step 3: Metadata fetcher (`src/metadata-fetcher.ts`)
- Use Obsidian's `requestUrl()` to fetch the URL (bypasses CORS)
- Parse HTML response for Open Graph meta tags: `og:title`, `og:description`, `og:image`, `og:site_name`
- Fallback to `<title>`, `<meta name="description">`, favicon via `<link rel="icon">`
- Return a `CardMetadata` object: `{ url, title, description, image, favicon, siteName }`

### Step 4: Card renderer (`src/card-renderer.ts`)
- Register a code block processor for language `linkcard`
- Parse YAML-like content from the code block (url, title, description, image, tags, tldr, summary)
- Build HTML card element with:
  - Thumbnail image (if available)
  - Favicon + site name
  - Title (clickable link)
  - Description text
  - TLDR section (if AI-generated)
  - Tag pills
- Card is clickable to open the URL externally

### Step 5: Commands (`src/main.ts`)
Two commands registered in `onload()`:

1. **"Create Link Card"**
   - Gets URL from clipboard or editor selection
   - Calls metadata fetcher
   - Inserts a fenced code block at cursor:
     ````
     ```linkcard
     url: https://example.com
     title: Page Title
     description: A description of the page
     image: https://example.com/image.jpg
     favicon: https://example.com/favicon.ico
     ```
     ````

2. **"Summarize Link Card"** (requires AI provider configured)
   - Reads the `linkcard` code block the cursor is inside
   - Fetches the page content (text extraction from HTML)
   - Sends to configured AI provider with a prompt requesting TLDR, summary, and tags
   - Updates the code block with `tldr:`, `summary:`, and `tags:` fields

### Step 6: AI provider (`src/ai-provider.ts`)
Abstract interface with implementations for:
- **OpenAI**: POST to `https://api.openai.com/v1/chat/completions` via `requestUrl`
- **Anthropic**: POST to `https://api.anthropic.com/v1/messages` via `requestUrl`
- **GitHub Copilot**: POST to GitHub Copilot chat completions endpoint via `requestUrl` (uses OpenAI-compatible format with GitHub token auth)

Prompt template:
```
Analyze this web page content and provide:
1. TLDR (one sentence)
2. Summary (2-3 sentences)
3. Tags (3-7 topic tags)

Respond in YAML format with keys: tldr, summary, tags
```

### Step 7: Styling (`styles.css`)
Card CSS with:
- Rounded corners, subtle shadow, border
- Flexbox layout: image on left, content on right
- Favicon + site name header
- Title styled as link
- Description in muted text
- Tag pills with background color
- TLDR in a highlighted block
- Responsive - stacks vertically on narrow views
- Respects Obsidian dark/light theme via CSS variables

## Card Data Format (in markdown)

````markdown
```linkcard
url: https://example.com/article
title: How to Build an Obsidian Plugin
description: A comprehensive guide to building plugins for Obsidian.
image: https://example.com/hero.jpg
favicon: https://example.com/favicon.ico
site: Example.com
tldr: Step-by-step guide covering plugin setup, API usage, and publishing.
summary: This article walks through creating an Obsidian plugin from scratch, covering project scaffolding with TypeScript and esbuild, using the Obsidian API for editors and views, and the community plugin submission process.
tags: obsidian, plugins, typescript, development
```
````

## Key Obsidian APIs Used
- `Plugin.onload()` / `onunload()` - lifecycle
- `Plugin.registerMarkdownCodeBlockProcessor("linkcard", handler)` - card rendering
- `Plugin.addCommand()` - register commands
- `Plugin.addSettingTab()` - settings UI
- `Plugin.loadData()` / `saveData()` - persist settings
- `requestUrl()` - CORS-free HTTP requests
- `MarkdownView` / `Editor` - read/write editor content

## Verification
1. Run `pnpm install && pnpm build` - should produce `main.js` without errors
2. Copy `main.js`, `manifest.json`, `styles.css` to an Obsidian vault's `.obsidian/plugins/obsidian-link-cards/` directory
3. Enable the plugin in Obsidian Settings > Community Plugins
4. Test "Create Link Card" command with a URL - should insert a rendered card
5. Configure an AI provider in settings, test "Summarize Link Card" - should add TLDR/summary/tags
