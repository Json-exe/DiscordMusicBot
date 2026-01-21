import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import LinkParserService from '../../Services/LinkParserService.js';
import containerSetup from '../../util/containerSetup.js';
import { ServiceIdentifiers } from '../../util/models.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import JasonMusicPlayer from '../../Services/JasonMusicPlayer.js';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a song from a given URL')
		.addStringOption((option) => option.setName('song').setDescription('The song to play (URL)').setRequired(true))
		.toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}
		if (!interaction.guildId || !interaction.member.voice.channelId) {
			return;
		}

		const songUrl = interaction.options.getString('song');
		if (songUrl && songUrl.length > 0) {
			const parserService = await containerSetup.getAsync<LinkParserService>(ServiceIdentifiers.LinkParserService);
			const parser = await parserService.checkLinkSupport(songUrl);
			if (parser) {
				await interaction.deferReply();
				try {
					const player = await parser.parseLink(
						songUrl,
						interaction.guildId,
						interaction.member.voice.channelId,
						interaction.user,
						interaction.channelId,
					);
					if (!player) {
						await interaction.editReply({ content: 'There was something wrong getting the player!' });
						return;
					}

					await startPlayerIfNeeded(player);
					await interaction.editReply({
						embeds: [new EmbedBuilder().setTitle('Queued your requested song!').setColor(0x0000ff)],
					});
				} catch (err) {
					await interaction.editReply({ content: `There was an error processing your request: ${err}` });
					console.error(err);
				}

				return;
			} else {
				await interaction.reply({
					embeds: [
						new EmbedBuilder().setTitle('Invalid URL Type. Bot only supports YT and Spotify Links!').setColor(0x0000ff),
					],
				});
				return;
			}
		}
		await interaction.reply({
			embeds: [
				new EmbedBuilder().setTitle('Invalid URL Type. Bot only supports YT and Spotify Links!').setColor(0x0000ff),
			],
		});
	},
} satisfies Command;

async function startPlayerIfNeeded(player: JasonMusicPlayer) {
	if (!player.connected) {
		await player.connect();
		await player.play();
		return;
	}

	if (player.paused) {
		await player.resume();
	}

	await player.updateControls();
}
