import { Notice, Plugin } from "obsidian";
import {
	type LinkCardsSettings,
	DEFAULT_SETTINGS,
	LinkCardsSettingTab,
} from "./settings";
import { renderCard } from "./card-renderer";
import { fetchMetadata } from "./metadata-fetcher";
import { summarizeContent } from "./ai-provider";

export default class LinkCardsPlugin extends Plugin {
	settings: LinkCardsSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LinkCardsSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("linkcard", renderCard);

		this.addCommand({
			id: "create-link-card",
			name: "Create Link Card",
			editorCallback: async (editor) => {
				let url = editor.getSelection().trim();

				if (!url) {
					try {
						url = (await navigator.clipboard.readText()).trim();
					} catch {
						new Notice("No URL found in selection or clipboard");
						return;
					}
				}

				if (!url || !looksLikeUrl(url)) {
					new Notice("No valid URL found in selection or clipboard");
					return;
				}

				new Notice("Fetching link metadata...");

				try {
					const meta = await fetchMetadata(url);

					const lines = [
						"```linkcard",
						`url: ${meta.url}`,
						`title: ${meta.title}`,
					];
					if (meta.description)
						lines.push(`description: ${meta.description}`);
					if (meta.image) lines.push(`image: ${meta.image}`);
					if (meta.favicon) lines.push(`favicon: ${meta.favicon}`);
					if (meta.siteName)
						lines.push(`site: ${meta.siteName}`);
					lines.push("```");

					const cursor = editor.getCursor();
					editor.replaceRange(
						lines.join("\n") + "\n",
						cursor
					);

					new Notice("Link card created");
				} catch (err) {
					new Notice(
						`Failed to fetch metadata: ${err instanceof Error ? err.message : String(err)}`
					);
				}
			},
		});

		this.addCommand({
			id: "summarize-link-card",
			name: "Summarize Link Card",
			editorCallback: async (editor) => {
				if (this.settings.aiProvider === "none") {
					new Notice(
						"Configure an AI provider in Link Cards settings first"
					);
					return;
				}

				const cursor = editor.getCursor();
				const fullText = editor.getValue();
				const offset = editor.posToOffset(cursor);

				const block = findLinkcardBlock(fullText, offset);
				if (!block) {
					new Notice(
						"Place your cursor inside a linkcard code block"
					);
					return;
				}

				const urlMatch = block.content.match(/^url:\s*(.+)$/m);
				if (!urlMatch) {
					new Notice("Link card has no URL");
					return;
				}

				const url = urlMatch[1].trim();
				new Notice("Fetching page content for AI summarization...");

				try {
					const meta = await fetchMetadata(url);
					const pageText = [
						meta.title,
						meta.description,
					]
						.filter(Boolean)
						.join("\n\n");

					if (!pageText) {
						new Notice("No content found to summarize");
						return;
					}

					new Notice("Summarizing with AI...");
					const result = await summarizeContent(
						pageText,
						this.settings
					);

					let updatedContent = block.content;
					updatedContent = upsertField(
						updatedContent,
						"tldr",
						result.tldr
					);
					updatedContent = upsertField(
						updatedContent,
						"summary",
						result.summary
					);
					if (result.tags.length > 0) {
						updatedContent = upsertField(
							updatedContent,
							"tags",
							result.tags.join(", ")
						);
					}

					const startPos = editor.offsetToPos(block.start);
					const endPos = editor.offsetToPos(block.end);
					editor.replaceRange(
						"```linkcard\n" + updatedContent + "\n```",
						startPos,
						endPos
					);

					new Notice("Link card summarized");
				} catch (err) {
					new Notice(
						`AI summarization failed: ${err instanceof Error ? err.message : String(err)}`
					);
				}
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function looksLikeUrl(str: string): boolean {
	try {
		const u = new URL(str);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}

interface BlockRange {
	start: number;
	end: number;
	content: string;
}

function findLinkcardBlock(text: string, offset: number): BlockRange | null {
	const pattern = /```linkcard\n([\s\S]*?)```/g;
	let match;
	while ((match = pattern.exec(text)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (offset >= start && offset <= end) {
			return { start, end, content: match[1] };
		}
	}
	return null;
}

function upsertField(content: string, key: string, value: string): string {
	const re = new RegExp(`^${key}:.*$`, "m");
	const line = `${key}: ${value}`;
	if (re.test(content)) {
		return content.replace(re, line);
	}
	return content.trimEnd() + "\n" + line;
}
