import { requestUrl } from "obsidian";

export interface CardMetadata {
	url: string;
	title: string;
	description: string;
	image: string;
	favicon: string;
	siteName: string;
}

export async function fetchMetadata(url: string): Promise<CardMetadata> {
	const response = await requestUrl({ url });
	const html = response.text;

	return {
		url,
		title: extractMeta(html, "og:title") || extractTitle(html) || url,
		description:
			extractMeta(html, "og:description") ||
			extractMetaName(html, "description") ||
			"",
		image: resolveUrl(url, extractMeta(html, "og:image") || ""),
		favicon: resolveUrl(url, extractFavicon(html) || "/favicon.ico"),
		siteName: extractMeta(html, "og:site_name") || new URL(url).hostname,
	};
}

function extractMeta(html: string, property: string): string {
	const re = new RegExp(
		`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']`,
		"i"
	);
	const match = html.match(re);
	if (match) return match[1];

	const reReversed = new RegExp(
		`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapeRegex(property)}["']`,
		"i"
	);
	const matchReversed = html.match(reReversed);
	return matchReversed ? matchReversed[1] : "";
}

function extractMetaName(html: string, name: string): string {
	const re = new RegExp(
		`<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`,
		"i"
	);
	const match = html.match(re);
	if (match) return match[1];

	const reReversed = new RegExp(
		`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegex(name)}["']`,
		"i"
	);
	const matchReversed = html.match(reReversed);
	return matchReversed ? matchReversed[1] : "";
}

function extractTitle(html: string): string {
	const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
	return match ? match[1].trim() : "";
}

function extractFavicon(html: string): string {
	const match = html.match(
		/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i
	);
	if (match) return match[1];

	const matchReversed = html.match(
		/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i
	);
	return matchReversed ? matchReversed[1] : "";
}

function resolveUrl(base: string, path: string): string {
	if (!path) return "";
	try {
		return new URL(path, base).href;
	} catch {
		return path;
	}
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
