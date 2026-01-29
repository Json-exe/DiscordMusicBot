import { CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../index.js';
import fs from 'node:fs';
import path from 'node:path';

export default {
	data: {
		name: 'get-server-files',
		description: 'Get all files in the music folder on the server',
	},
	async execute(interaction: CommandInteraction) {
		const music_dir = process.env.MUSIC_DIRECTORY;
		if (!music_dir) throw new Error('MUSIC_DIRECTORY is not defined in environment variables');

		try {
			const dir = path.resolve(music_dir);
			if (!fs.existsSync(dir)) {
				await interaction.reply({
					content: 'No music folder found on the server. Please create one and add some music files.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const files = fs.readdirSync(dir).filter((file: string) => file.endsWith('.mp3'));
			if (files.length === 0) {
				await interaction.reply({
					content: 'No music files found on the server. Please add some music files.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			let response = '';
			for (const file of files) {
				response += '- ' + file + '\n';
			}
			await interaction.reply({
				embeds: [
					new EmbedBuilder().setTitle('Available music files:').setDescription(`${response}`).setColor(0x0000ff),
				],
				flags: MessageFlags.Ephemeral,
			});
		} catch (e) {
			console.log(e);
		}
	},
} satisfies Command;
