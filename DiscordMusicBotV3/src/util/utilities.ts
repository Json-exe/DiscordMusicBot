import { EmbedFooterOptions } from 'discord.js';

export const footerOptions: EmbedFooterOptions = {
	text: process.env.FOOTER_TEXT ?? 'Powered by DiscordJS',
	iconURL: process.env.FOOTER_ICON_URL,
};
