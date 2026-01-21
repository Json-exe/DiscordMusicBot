import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import container from '../../util/containerSetup.js';
import AudioPlayerService from '../../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from '../../util/models.js';

export default {
	data: new SlashCommandBuilder()
		.setName('play-dj-stream')
		.setDescription('Plays the dj stream. Stops current playback and clears queue!')
		.toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}

		if (!interaction.member.voice.channel || !interaction.guildId) {
			return;
		}

		const streamUrl = 'http://host.docker.internal:8000/radio.ogg';
		const response = await fetch(streamUrl);
		if (!response.ok) {
			await interaction.reply({
				content: `Could not access DJ stream. Is it started?`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
		const player = audioService.getOrCreatePlayer(
			interaction.guildId,
			interaction.member.voice.channel.id,
			interaction.channelId,
		);
		const result = await player.search(
			{
				source: 'http',
				query: streamUrl,
			},
			interaction.user,
		);

		if (result.loadType === 'error' || result.loadType === 'empty') {
			await interaction.reply({ content: `Could not find dj stream!`, flags: MessageFlags.Ephemeral });
			return;
		}

		await interaction.reply({ content: `Playing DJ stream!` });
		await player.stopPlaying();
		await player.filterManager.setEQPreset('Electronic');
		await player.filterManager.applyPlayerFilters();
		player.queue.add(result.tracks[0]);
		await player.connect();
		await player.play();
	},
} satisfies Command;
