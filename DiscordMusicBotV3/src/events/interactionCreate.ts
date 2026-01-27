import { URL } from 'node:url';
import { ButtonInteraction, CommandInteraction, Events } from 'discord.js';
import { loadCommands } from '../util/loaders.js';
import type { Event } from './index.js';
import container from '../util/containerSetup.js';
import AudioPlayerService from '../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from '../util/models.js';

const commands = await loadCommands(new URL('../commands/', import.meta.url));

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isCommand()) {
			await processCommand(interaction);
		} else if (interaction.isButton()) {
			await processButton(interaction);
		}
	},
} satisfies Event<Events.InteractionCreate>;

async function processCommand(interaction: CommandInteraction) {
	const command = commands.get(interaction.commandName);

	if (!command) {
		throw new Error(`Command '${interaction.commandName}' not found.`);
	}

	await command.execute(interaction);
}

async function processButton(interaction: ButtonInteraction) {
	if (!interaction.guildId) return;
	const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
	const player = audioService.getPlayer(interaction.guildId);
	if (!player || !player.connected) return;
	switch (interaction.customId) {
		case 'skip':
			if (player.queue.tracks.length > 0) {
				await player.skip();
			}
			break;
		case 'previous':
			const previousTrack = await player.queue.shiftPrevious();
			if (previousTrack) {
				await player.play({ track: previousTrack });
			}
			break;
		case 'play_pause':
			if (player.playing) {
				await player.pause();
			} else if (player.paused) {
				await player.resume();
			}
			break;
		case 'stop':
			await player.stopPlaying(true);
			break;
	}

	const row = player.createNowPlayingComponents();
	await interaction.update({ components: [row.toJSON()] });
}
