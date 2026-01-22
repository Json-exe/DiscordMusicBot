import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import container from '../../util/containerSetup.js';
import AudioPlayerService from '../../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from '../../util/models.js';

export default {
	data: new SlashCommandBuilder().setName('show-queue').setDescription('Shows the current queue.').toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}

		if (!interaction.guildId) {
			return;
		}

		const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
		const player = audioService.getPlayer(interaction.guildId);
		if (!player) {
			await interaction.reply({ content: 'No music playing!' });
			return;
		}

		let queue = player.queue.tracks.map(
			(track, index) =>
				`${index + 1}. ${track.info.title} - ${track.info.author} - ${player.getHumanReadableDuration(track.info.duration)}`,
		);

		if (queue.length === 0) {
			await interaction.reply({ content: 'Queue is empty!' });
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`Current queue (${queue.length} tracks) Showing 10:`)
			.setDescription(queue.slice(0, 10).join('\n'));
		await interaction.reply({ embeds: [embed] });
	},
} satisfies Command;
