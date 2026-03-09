import { Plugin } from "obsidian";
import {
	type LinkCardsSettings,
	DEFAULT_SETTINGS,
	LinkCardsSettingTab,
} from "./settings";

export default class LinkCardsPlugin extends Plugin {
	settings: LinkCardsSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LinkCardsSettingTab(this.app, this));
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
