# Detailed Findings — CR-20260310

## Critical

### F-C1: API response access crashes on unexpected payloads

**Files:** `src/ai-provider.ts:62`, `src/ai-provider.ts:87`, `src/ai-provider.ts:114`

All three AI provider functions access deeply nested response properties without null checks:

```ts
// ai-provider.ts:62
const text = response.json.choices[0].message.content;  // OpenAI

// ai-provider.ts:87
const text = response.json.content[0].text;              // Anthropic

// ai-provider.ts:114
const text = response.json.choices[0].message.content;  // Copilot
```

If the API returns an error payload, an empty response, or an unexpected shape, these lines throw `TypeError: Cannot read properties of undefined`. The error propagates as an opaque crash rather than a helpful message.

**Fix:** Add defensive checks:
```ts
const choices = response.json?.choices;
if (!choices?.[0]?.message?.content) {
    throw new Error("Unexpected response from OpenAI API");
}
const text = choices[0].message.content;
```

---

### F-C2: Summarize command sends only title and description to AI

**File:** `src/main.ts:107-112`

```ts
const pageText = [meta.title, meta.description]
    .filter(Boolean)
    .join("\n\n");
```

The "Summarize Link Card" command re-fetches metadata but only extracts `title` and `description` — typically 1-2 sentences total. The AI prompt says "Analyze this web page content" but receives almost no content. Summaries will be low quality or hallucinated.

**Fix:** Either fetch and extract the page body text (strip tags, limit to N characters), or acknowledge the limitation in the prompt so the AI does not fabricate details.

---

## High

### F-H1: No API key validation before making requests

**File:** `src/ai-provider.ts:40-44`, `src/ai-provider.ts:66-70`

`callOpenAi` and `callAnthropic` do not check whether `apiKey` is non-empty before sending the HTTP request. An empty key produces a confusing 401 error from the API rather than a clear user-facing message.

**Fix:** Guard at the top of each function:
```ts
if (!apiKey) throw new Error("API key is required for OpenAI");
```

---

### F-H2: Card block parser truncates values containing colons

**File:** `src/card-renderer.ts:29-33`

```ts
const colonIdx = line.indexOf(":");
const key = line.slice(0, colonIdx).trim().toLowerCase();
const value = line.slice(colonIdx + 1).trim();
```

This correctly uses `indexOf` to split on the *first* colon only. Despite the initial concern, this actually handles URLs like `https://example.com` properly since `line.slice(colonIdx + 1)` captures everything after the first colon.

**Remaining issue:** The regex-based parser in `upsertField` (`main.ts:204`) replaces the entire line with `^${key}:.*$`, which works correctly for single-line values. However, if a field value were to span multiple lines, neither the parser nor the updater would handle it. This is acceptable for the current flat key-value format but worth noting.

---

### F-H3: No keyboard accessibility on link cards

**File:** `src/card-renderer.ts:83-84`

```ts
const card = el.createDiv({ cls: "linkcard" });
card.addEventListener("click", () => window.open(data.url, "_blank"));
```

The card `div` has a click handler but:
- No `tabindex="0"` to make it focusable
- No `role="button"` or `role="link"` for screen readers
- No `keydown` handler for Enter/Space activation
- No `:focus` / `:focus-visible` CSS styles (see `styles.css`)

Users relying on keyboard navigation cannot interact with the card body. The inner `<a>` title link is keyboard-accessible, but the card-level click target is not.

---

### F-H4: Regex injection risk in `upsertField`

**File:** `src/main.ts:204`

```ts
const re = new RegExp(`^${key}:.*$`, "m");
```

The `key` parameter is interpolated directly into a regex without escaping. Currently, `key` values are hardcoded strings (`"tldr"`, `"summary"`, `"tags"`), so this is not exploitable today. However, it is a latent injection vector — if any future caller passes a user-controlled key, it becomes a regex injection bug.

**Fix:** Escape the key or use a string-based approach:
```ts
const re = new RegExp(`^${escapeRegex(key)}:.*$`, "m");
```

---

## Medium

### F-M1: No request timeouts on API calls

**File:** `src/ai-provider.ts`

None of the `requestUrl()` calls specify a timeout. If an AI API hangs (network issue, overloaded server), the Obsidian UI blocks indefinitely with no way to cancel. Obsidian's `requestUrl` does not have a built-in timeout.

**Mitigation:** Wrap calls with `Promise.race` against a timeout promise, or document the limitation.

---

### F-M2: Hardcoded Anthropic API version

**File:** `src/ai-provider.ts:76`

```ts
"anthropic-version": "2023-06-01",
```

This version string is over two years old. While the Anthropic API maintains backward compatibility, newer features and models may require an updated version header.

**Fix:** Make it a constant with a comment, or expose it as a setting.

---

### F-M3: No input validation in settings tab

**File:** `src/settings.ts`

Settings values are saved on every keystroke with no validation:
- API key format is not checked
- Copilot endpoint URL is not validated (could be non-HTTPS or invalid)
- Model name is not validated

Invalid values only surface as confusing API errors later.

---

### F-M4: API keys stored in plain text

**File:** `src/settings.ts:8`

API keys are stored as plain strings in Obsidian's `data.json` file. This is standard for Obsidian plugins but should be documented. The settings tab also displays the full key in a text input without masking.

---

### F-M5: `obsidian` dependency pinned to `"latest"`

**File:** `package.json:18`

```json
"obsidian": "latest"
```

This means every `pnpm install` could pull a different version with potential breaking changes. Should be pinned to a range like `"^1.5.0"`.

---

### F-M6: Missing CSS focus states

**File:** `styles.css`

No `:focus` or `:focus-visible` rules exist for `.linkcard`, `.linkcard-title`, or any interactive element. Keyboard users have no visual focus indicator.

---

### F-M7: Incomplete TypeScript strict mode

**File:** `tsconfig.json`

The config enables `strictNullChecks` and `noImplicitAny` individually but does not use `"strict": true`, which also enables:
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

This leaves potential type-safety gaps.

---

## Low

### F-L1: No test suite

No test files or testing dependencies exist. The pure functions (`parseCardBlock`, `parseYamlResponse`, `looksLikeUrl`, `extractMeta`, `resolveUrl`) are all readily testable.

---

### F-L2: Favicon URL fallback returns raw path on resolution failure

**File:** `src/metadata-fetcher.ts:82-83`

```ts
catch {
    return path;  // returns unresolved path like "/favicon.ico"
}
```

If `resolveUrl` fails, it returns the raw relative path which won't render correctly. Should return `""` to suppress the broken image.

---

### F-L3: AI temperature may be too conservative

**File:** `src/ai-provider.ts:58,110`

Temperature `0.3` is very low for summarization. A value of `0.4`–`0.5` may produce more natural summaries while remaining deterministic. This is subjective — marking as low.

---

### F-L4: HTML regex parsing is inherently fragile

**File:** `src/metadata-fetcher.ts`

The regex-based HTML parsing handles common cases but misses edge cases:
- Attributes with extra whitespace around `=` signs
- Single-quoted vs double-quoted attributes
- Self-closing meta tags with various spacing

A dedicated HTML parser (e.g., DOMParser) would be more robust, but adds weight. Regex is a pragmatic choice for a plugin.

---

### F-L5: Minor accessibility gaps

**Files:** `src/card-renderer.ts`, `styles.css`

- Favicon `alt=""` is correct (decorative image) but the card lacks an overall `aria-label`
- No `target="_blank"` warning for screen readers (rel="noopener" is also missing from the title link)
- Tag elements have no semantic role

---

## Info

### F-I1: Code duplication across AI providers

**File:** `src/ai-provider.ts`

`callOpenAi` and `callCopilot` are nearly identical (same request shape, same response parsing). Consider extracting a shared `callOpenAiCompatible` helper.

---

### F-I2: Planning documents included in repo

**Directory:** `plans/`, `PLAN.md`

Development planning documents are committed to the repository. This is fine for internal use but should be excluded before publishing to the Obsidian community plugin list.
