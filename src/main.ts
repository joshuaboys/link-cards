import { Notice, Plugin } from "obsidian";
import {
	type LinkCardsSettings,
	DEFAULT_SETTINGS,
	LinkCardsSettingTab,
} from "./settings";
import { renderCard } from "./card-renderer";
import { fetchMetadata } from "./metadata-fetcher";

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
