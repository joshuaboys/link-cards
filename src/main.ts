import { Plugin } from "obsidian";

export default class LinkCardsPlugin extends Plugin {
	async onload() {
		console.log("Link Cards plugin loaded");
	}

	onunload() {
		console.log("Link Cards plugin unloaded");
	}
}
