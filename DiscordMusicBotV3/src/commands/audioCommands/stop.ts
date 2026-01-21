import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import container from '../../util/containerSetup.js';
import { ServiceIdentifiers } from '../../util/models.js';
import AudioPlayerService from '../../Services/AudioPlayerService.js';

export default {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops the music and leaves the voice channel.')
		.toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}

		if (!interaction.guildId) return;

		const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
		const player = audioService.getPlayer(interaction.guildId);

		if (!player) {
			await interaction.reply({ content: 'No music playing!' });
			return;
		}
		await player.stopPlaying(true);
		await player.destroy('Stop command called!');
		await interaction.reply({ content: 'Stopping music!' });
	},
} satisfies Command;
