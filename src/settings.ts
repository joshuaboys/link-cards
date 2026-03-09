import { App, PluginSettingTab, Setting } from "obsidian";
import type LinkCardsPlugin from "./main";

export type AiProvider = "none" | "openai" | "anthropic" | "copilot";

export interface LinkCardsSettings {
	aiProvider: AiProvider;
	apiKey: string;
	modelName: string;
	copilotEndpoint: string;
}

export const DEFAULT_SETTINGS: LinkCardsSettings = {
	aiProvider: "none",
	apiKey: "",
	modelName: "",
	copilotEndpoint: "",
};

export class LinkCardsSettingTab extends PluginSettingTab {
	plugin: LinkCardsPlugin;

	constructor(app: App, plugin: LinkCardsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("AI provider")
			.setDesc("Choose an AI provider for link summarization")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "None")
					.addOption("openai", "OpenAI")
					.addOption("anthropic", "Anthropic")
					.addOption("copilot", "GitHub Copilot")
					.setValue(this.plugin.settings.aiProvider)
					.onChange(async (value) => {
						this.plugin.settings.aiProvider = value as AiProvider;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.aiProvider === "copilot") {
			new Setting(containerEl)
				.setName("Copilot endpoint")
				.setDesc("GitHub Copilot API endpoint URL")
				.addText((text) =>
					text
						.setPlaceholder("https://api.github.com/copilot/...")
						.setValue(this.plugin.settings.copilotEndpoint)
						.onChange(async (value) => {
							this.plugin.settings.copilotEndpoint = value;
							await this.plugin.saveSettings();
						})
				);
		}

		if (this.plugin.settings.aiProvider !== "none") {
			new Setting(containerEl)
				.setName("API key")
				.setDesc("API key for the selected AI provider")
				.addText((text) =>
					text
						.setPlaceholder("sk-...")
						.setValue(this.plugin.settings.apiKey)
						.onChange(async (value) => {
							this.plugin.settings.apiKey = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Model name")
				.setDesc("Model to use for summarization (leave empty for default)")
				.addText((text) =>
					text
						.setPlaceholder("e.g. gpt-4o, claude-sonnet-4-20250514")
						.setValue(this.plugin.settings.modelName)
						.onChange(async (value) => {
							this.plugin.settings.modelName = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
