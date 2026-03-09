import type { MarkdownPostProcessorContext } from "obsidian";

interface CardData {
	url: string;
	title: string;
	description: string;
	image: string;
	favicon: string;
	site: string;
	tldr: string;
	summary: string;
	tags: string[];
}

function parseCardBlock(source: string): CardData {
	const data: CardData = {
		url: "",
		title: "",
		description: "",
		image: "",
		favicon: "",
		site: "",
		tldr: "",
		summary: "",
		tags: [],
	};

	for (const line of source.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim().toLowerCase();
		const value = line.slice(colonIdx + 1).trim();

		switch (key) {
			case "url":
				data.url = value;
				break;
			case "title":
				data.title = value;
				break;
			case "description":
				data.description = value;
				break;
			case "image":
				data.image = value;
				break;
			case "favicon":
				data.favicon = value;
				break;
			case "site":
				data.site = value;
				break;
			case "tldr":
				data.tldr = value;
				break;
			case "summary":
				data.summary = value;
				break;
			case "tags":
				data.tags = value
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);
				break;
		}
	}

	return data;
}

export function renderCard(
	source: string,
	el: HTMLElement,
	_ctx: MarkdownPostProcessorContext
): void {
	const data = parseCardBlock(source);
	if (!data.url) {
		el.createEl("p", { text: "Link card: missing URL" });
		return;
	}

	const card = el.createDiv({ cls: "linkcard" });
	card.addEventListener("click", () => window.open(data.url, "_blank"));

	if (data.image) {
		const imgContainer = card.createDiv({ cls: "linkcard-image" });
		imgContainer.createEl("img", { attr: { src: data.image, alt: data.title } });
	}

	const content = card.createDiv({ cls: "linkcard-content" });

	const header = content.createDiv({ cls: "linkcard-header" });
	if (data.favicon) {
		header.createEl("img", {
			cls: "linkcard-favicon",
			attr: { src: data.favicon, alt: "" },
		});
	}
	if (data.site) {
		header.createEl("span", {
			cls: "linkcard-site",
			text: data.site,
		});
	}

	const titleEl = content.createEl("a", {
		cls: "linkcard-title",
		text: data.title || data.url,
		href: data.url,
	});
	titleEl.addEventListener("click", (e) => e.stopPropagation());

	if (data.description) {
		content.createEl("p", {
			cls: "linkcard-description",
			text: data.description,
		});
	}

	if (data.tldr) {
		const tldrBlock = content.createDiv({ cls: "linkcard-tldr" });
		tldrBlock.createEl("strong", { text: "TLDR: " });
		tldrBlock.createEl("span", { text: data.tldr });
	}

	if (data.summary) {
		content.createEl("p", {
			cls: "linkcard-summary",
			text: data.summary,
		});
	}

	if (data.tags.length > 0) {
		const tagsContainer = content.createDiv({ cls: "linkcard-tags" });
		for (const tag of data.tags) {
			tagsContainer.createEl("span", {
				cls: "linkcard-tag",
				text: tag,
			});
		}
	}
}
