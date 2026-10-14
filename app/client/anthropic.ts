import Anthropic from '@anthropic-ai/sdk';
import config from '../../config';

let client: Anthropic | null = null;

// Created on first use so the API boots without AI credentials configured.
// With no ANTHROPIC_API_KEY the SDK falls back to its other credential sources.
export const getAnthropicClient = () => {
	if (!client) {
		client = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : new Anthropic();
	}
	return client;
};
