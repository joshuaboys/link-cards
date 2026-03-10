# Recommendations — CR-20260310

Prioritized action items derived from the full code review. Each references a finding ID from [FINDINGS.md](FINDINGS.md) or [SECURITY.md](SECURITY.md).

---

## Priority 1 — Fix Before Release

These issues affect reliability or correctness and should be resolved before any public release.

### R1: Add null guards to API response parsing

**Ref:** F-C1
**File:** `src/ai-provider.ts`
**Effort:** Small

Add defensive checks before accessing nested response properties in all three provider functions. Example for OpenAI:

```ts
const body = response.json;
const text = body?.choices?.[0]?.message?.content;
if (!text) {
    throw new Error(`Unexpected API response: ${JSON.stringify(body).slice(0, 200)}`);
}
```

Apply the same pattern to `callAnthropic` (check `body?.content?.[0]?.text`) and `callCopilot`.

---

### R2: Validate API keys before making requests

**Ref:** F-H1
**File:** `src/ai-provider.ts`
**Effort:** Small

Add a guard at the top of each provider function:

```ts
if (!apiKey) throw new Error("API key is required — configure it in Link Cards settings");
```

---

### R3: Improve summarization input quality

**Ref:** F-C2
**File:** `src/main.ts:107-112`
**Effort:** Medium

Two options (choose one):

**Option A (quick):** Read title, description, tldr, and summary from the existing block content instead of re-fetching. Adjust the AI prompt to say "Based on this link metadata" rather than "Analyze this web page content."

**Option B (better):** After fetching the HTML, strip tags and extract visible text content (limit to ~4000 chars). Send this alongside title/description for a more informed summary.

---

### R4: Add keyboard accessibility to link cards

**Ref:** F-H3
**File:** `src/card-renderer.ts`, `styles.css`
**Effort:** Small

```ts
card.setAttribute("tabindex", "0");
card.setAttribute("role", "link");
card.setAttribute("aria-label", data.title || data.url);
card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.open(data.url, "_blank", "noopener");
    }
});
```

Add to `styles.css`:
```css
.linkcard:focus-visible {
    outline: 2px solid var(--text-accent);
    outline-offset: 2px;
}
```

---

## Priority 2 — Should Fix

These improve security, reliability, and developer experience.

### R5: Validate Copilot endpoint URL

**Ref:** SEC-2
**File:** `src/ai-provider.ts:96`
**Effort:** Small

```ts
if (!endpoint) throw new Error("Copilot endpoint not configured");
if (!endpoint.startsWith("https://")) throw new Error("Copilot endpoint must use HTTPS");
```

---

### R6: Add `noopener` to `window.open` calls

**Ref:** SEC-6
**File:** `src/card-renderer.ts:84`
**Effort:** Trivial

```ts
window.open(data.url, "_blank", "noopener");
```

---

### R7: Enable full TypeScript strict mode

**Ref:** F-M7
**File:** `tsconfig.json`
**Effort:** Small (may surface new type errors to fix)

```json
{
    "compilerOptions": {
        "strict": true,
        // remove individual strictNullChecks and noImplicitAny — covered by strict
    }
}
```

---

### R8: Pin `obsidian` dependency version

**Ref:** F-M5
**File:** `package.json`
**Effort:** Trivial

```json
"obsidian": "^1.5.0"
```

---

### R9: Add CSS focus styles

**Ref:** F-M6
**File:** `styles.css`
**Effort:** Trivial

```css
.linkcard:focus-visible {
    outline: 2px solid var(--text-accent);
    outline-offset: 2px;
}

.linkcard-title:focus-visible {
    outline: 2px solid var(--text-accent);
    outline-offset: 1px;
}
```

---

### R10: Add render-time URL protocol check

**Ref:** SEC-5
**File:** `src/card-renderer.ts`
**Effort:** Trivial

Before setting the `href` on the title link and using the URL in click handlers:

```ts
if (!/^https?:\/\//i.test(data.url)) {
    el.createEl("p", { text: "Link card: invalid URL protocol" });
    return;
}
```

---

## Priority 3 — Nice to Have

### R11: Add unit tests

**Ref:** F-L1
**Effort:** Medium

Add `vitest` as a dev dependency. Priority test targets:

1. `parseCardBlock()` — various input formats, edge cases with colons
2. `parseYamlResponse()` — well-formed and malformed AI responses
3. `looksLikeUrl()` — protocol validation
4. `resolveUrl()` — relative/absolute path handling
5. `extractMeta()` / `extractMetaName()` — various HTML patterns
6. `upsertField()` — insert and update paths
7. `findLinkcardBlock()` — cursor positioning

---

### R12: Deduplicate OpenAI-compatible providers

**Ref:** F-I1
**File:** `src/ai-provider.ts`
**Effort:** Small

```ts
async function callOpenAiCompatible(
    content: string,
    apiKey: string,
    model: string,
    endpoint: string
): Promise<AiResult> { ... }

// Then:
callOpenAi = (c, k, m) => callOpenAiCompatible(c, k, m, "https://api.openai.com/v1/chat/completions");
callCopilot = (c, k, _, endpoint) => callOpenAiCompatible(c, k, "", endpoint);
```

---

### R13: Mask API key in settings UI

**Ref:** SEC-1
**File:** `src/settings.ts`
**Effort:** Small

Use a password-type input or show only the last 4 characters:

```ts
text.inputEl.type = "password";
```

---

### R14: Update Anthropic API version

**Ref:** F-M2
**File:** `src/ai-provider.ts:76`
**Effort:** Trivial

Update to the current recommended version and add a comment:

```ts
"anthropic-version": "2024-10-22",  // Messages API stable version
```

---

### R15: Improve `resolveUrl` error fallback

**Ref:** F-L2
**File:** `src/metadata-fetcher.ts:82-83`
**Effort:** Trivial

```ts
catch {
    return "";  // return empty instead of broken relative path
}
```

---

## Implementation Roadmap

| Phase | Items | Estimated Scope |
|---|---|---|
| **Pre-release** | R1, R2, R3, R4 | 4 findings, ~100 lines changed |
| **Hardening** | R5, R6, R7, R8, R9, R10 | 6 findings, ~30 lines changed |
| **Quality** | R11, R12, R13, R14, R15 | 5 items, new test files + minor edits |
