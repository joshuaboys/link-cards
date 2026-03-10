# Security Review — CR-20260310

## Threat Model

The plugin operates in a local Obsidian vault and interacts with:
1. **External websites** — fetching metadata via HTTP(S)
2. **AI APIs** — sending content to OpenAI, Anthropic, or GitHub Copilot
3. **Local storage** — saving settings including API keys to `data.json`
4. **DOM rendering** — creating HTML elements from fetched metadata

## Findings

### SEC-1: API Keys Stored in Plain Text (Medium)

**File:** `src/settings.ts`
**Location:** Persisted via `this.plugin.saveSettings()` → Obsidian `data.json`

API keys are stored as unencrypted strings in Obsidian's plugin data directory. This file is:
- Readable by any process with user-level file access
- Potentially synced to cloud services (iCloud, Dropbox, Syncthing)
- Potentially committed to git if `.gitignore` is misconfigured (currently ignored via `data.json` in `.gitignore`)

**Risk:** API key theft from synced or backed-up vault directories.

**Mitigations:**
- The `.gitignore` correctly excludes `data.json` — good.
- Consider masking the API key display in settings (show only last 4 chars).
- Document the storage risk in the plugin README.

---

### SEC-2: Unvalidated Copilot Endpoint URL (Medium)

**File:** `src/settings.ts:57-58`, `src/ai-provider.ts:98-99`

```ts
// settings.ts — no validation
this.plugin.settings.copilotEndpoint = value;

// ai-provider.ts — used directly
const response = await requestUrl({ url: endpoint, ... });
```

The Copilot endpoint URL is user-configurable with no validation. A user (or a malicious settings import) could set this to:
- An HTTP (non-HTTPS) endpoint, sending API keys in plain text
- A local/internal network address (SSRF vector, though limited in Obsidian)
- A phishing endpoint that harvests API keys from the Authorization header

**Fix:** Validate that the endpoint starts with `https://` before making requests.

---

### SEC-3: Content Sent to Third-Party AI APIs (Low)

**File:** `src/ai-provider.ts`

Page metadata (title, description) is sent to external AI providers. If a user uses this on sensitive internal URLs, metadata could be exposed to OpenAI/Anthropic servers.

**Risk:** Low — users opt in by configuring an AI provider, and only title/description are sent (not full page content). However, this should be documented.

---

### SEC-4: No Protocol Enforcement for Metadata Fetching (Low)

**File:** `src/main.ts:175-181`

```ts
function looksLikeUrl(str: string): boolean {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
}
```

While `looksLikeUrl` correctly limits to `http:` and `https:` protocols (preventing `javascript:`, `file:`, etc.), it does accept plain `http:` URLs. Fetching over HTTP exposes the request to MITM attacks that could inject malicious metadata (crafted OG tags with misleading content).

**Risk:** Low in practice — this is standard behavior for link preview tools.

---

### SEC-5: DOM Injection via Metadata (Low)

**File:** `src/card-renderer.ts`

The renderer uses Obsidian's `createEl()` API to construct DOM elements:

```ts
imgContainer.createEl("img", { attr: { src: data.image, alt: data.title } });
content.createEl("a", { text: data.title, href: data.url });
```

Obsidian's `createEl` sets attributes and text content safely (not via `innerHTML`), which prevents XSS. The `text` property uses `textContent` internally, and `attr` sets attributes via `setAttribute`.

**Assessment:** No XSS vulnerability present. The Obsidian API handles escaping correctly. However, a malicious `data.url` in the `href` attribute could theoretically be a `javascript:` URL. This is mitigated by `looksLikeUrl()` validation at creation time, but the stored block content is not re-validated at render time.

**Recommendation:** Add a URL protocol check in `renderCard` before setting `href`:
```ts
const safeUrl = /^https?:\/\//i.test(data.url) ? data.url : "#";
```

---

### SEC-6: `window.open` Without `noopener` (Low)

**File:** `src/card-renderer.ts:84`

```ts
card.addEventListener("click", () => window.open(data.url, "_blank"));
```

Opening URLs with `window.open` without `noopener` allows the opened page to access `window.opener`. In an Obsidian context, the risk is minimal since the opener is the Electron webview, not a web page.

**Recommendation:** Use `window.open(data.url, "_blank", "noopener")` for defense in depth.

---

## Summary Matrix

| ID | Finding | Severity | Exploitable? | Fix Effort |
|---|---|---|---|---|
| SEC-1 | Plain-text API key storage | Medium | Requires file access | Low |
| SEC-2 | Unvalidated Copilot endpoint | Medium | Via settings manipulation | Low |
| SEC-3 | Content sent to AI APIs | Low | By design (opt-in) | N/A (document) |
| SEC-4 | HTTP protocol accepted | Low | MITM required | Low |
| SEC-5 | No render-time URL validation | Low | Requires block editing | Low |
| SEC-6 | Missing `noopener` on window.open | Low | Minimal in Electron | Trivial |

## Positive Security Practices

- `.gitignore` correctly excludes `data.json` (API keys)
- URL validation with `looksLikeUrl()` blocks non-HTTP protocols
- Regex input properly escaped via `escapeRegex()` in metadata fetcher
- DOM construction uses safe Obsidian APIs (no `innerHTML`)
- External dependencies are minimal (dev-only, no runtime deps)
