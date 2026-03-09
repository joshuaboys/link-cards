import { requestUrl } from "obsidian";
import type { LinkCardsSettings } from "./settings";

export interface AiResult {
	tldr: string;
	summary: string;
	tags: string[];
}

const PROMPT = `Analyze this web page content and provide:
1. TLDR (one sentence)
2. Summary (2-3 sentences)
3. Tags (3-7 topic tags)

Respond in YAML format with keys: tldr, summary, tags (comma-separated string).
Do not include any markdown formatting or code fences.`;

export async function summarizeContent(
	content: string,
	settings: LinkCardsSettings
): Promise<AiResult> {
	const { aiProvider, apiKey, modelName, copilotEndpoint } = settings;

	switch (aiProvider) {
		case "openai":
			return callOpenAi(content, apiKey, modelName || "gpt-4o-mini");
		case "anthropic":
			return callAnthropic(
				content,
				apiKey,
				modelName || "claude-sonnet-4-20250514"
			);
		case "copilot":
			return callCopilot(content, apiKey, copilotEndpoint);
		default:
			throw new Error("No AI provider configured");
	}
}

async function callOpenAi(
	content: string,
	apiKey: string,
	model: string
): Promise<AiResult> {
	const response = await requestUrl({
		url: "https://api.openai.com/v1/chat/completions",
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: PROMPT },
				{ role: "user", content },
			],
			temperature: 0.3,
		}),
	});

	const text = response.json.choices[0].message.content;
	return parseYamlResponse(text);
}

async function callAnthropic(
	content: string,
	apiKey: string,
	model: string
): Promise<AiResult> {
	const response = await requestUrl({
		url: "https://api.anthropic.com/v1/messages",
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			max_tokens: 512,
			system: PROMPT,
			messages: [{ role: "user", content }],
		}),
	});

	const text = response.json.content[0].text;
	return parseYamlResponse(text);
}

async function callCopilot(
	content: string,
	apiKey: string,
	endpoint: string
): Promise<AiResult> {
	if (!endpoint) throw new Error("Copilot endpoint not configured");

	const response = await requestUrl({
		url: endpoint,
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messages: [
				{ role: "system", content: PROMPT },
				{ role: "user", content },
			],
			temperature: 0.3,
		}),
	});

	const text = response.json.choices[0].message.content;
	return parseYamlResponse(text);
}

function parseYamlResponse(text: string): AiResult {
	const result: AiResult = { tldr: "", summary: "", tags: [] };

	const tldrMatch = text.match(/^tldr:\s*(.+)$/im);
	if (tldrMatch) result.tldr = tldrMatch[1].trim();

	const summaryMatch = text.match(/^summary:\s*(.+)$/im);
	if (summaryMatch) result.summary = summaryMatch[1].trim();

	const tagsMatch = text.match(/^tags:\s*(.+)$/im);
	if (tagsMatch) {
		result.tags = tagsMatch[1]
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}

	return result;
}
