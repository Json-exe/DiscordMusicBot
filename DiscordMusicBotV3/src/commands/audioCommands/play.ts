import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import LinkParserService from '../../Services/LinkParserService.js';
import containerSetup from '../../util/containerSetup.js';
import { ServiceIdentifiers } from '../../util/models.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import JasonMusicPlayer from '../../Services/JasonMusicPlayer.js';
import { footerOptions } from '../../util/utilities.js';

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
					const result = await parser.parseLink(
						songUrl,
						interaction.guildId,
						interaction.member.voice.channelId,
						interaction.user,
						interaction.channelId,
					);
					if (!result) {
						await interaction.editReply({ content: 'There was something wrong getting the player!' });
						return;
					}

					let name = '';
					let duration = '';
					let img = '';
					let link = '';
					let author = '';
					if (result.result.loadType === 'track') {
						name = result.result.tracks[0].info.title;
						duration = result.player.getHumanReadableDuration(result.result.tracks[0].info.duration);
						img = result.result.tracks[0].info.artworkUrl ?? process.env.FOOTER_ICON_URL ?? '';
						link = result.result.tracks[0].info.uri ?? '';
						author = result.result.tracks[0].info.author ?? '';
					} else if (result.result.loadType === 'playlist') {
						name = result.result.playlist?.name ?? '';
						duration = result.player.getHumanReadableDuration(result.result.playlist?.duration);
						img = result.result.playlist?.thumbnail ?? process.env.FOOTER_ICON_URL ?? '';
						link = result.result.playlist?.uri ?? '';
						author = result.result.playlist?.author ?? '';
					}

					await startPlayerIfNeeded(result.player);
					if (name.length <= 0) {
						await interaction.editReply({
							embeds: [new EmbedBuilder().setTitle(`Queued your song!`).setColor(0x0000ff)],
						});
						return;
					}

					const fields = [
						{
							name: 'Author',
							value: author,
							inline: true,
						},
						{
							name: 'Duration',
							value: duration,
							inline: true,
						},
					];

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle(`Queued: ${name}!`)
								.setThumbnail(img)
								.setURL(link)
								.setFields(fields)
								.setFooter(footerOptions)
								.setColor(0x0000ff),
						],
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
	} else if (!player.playing) {
		await player.play();
	}

	await player.updateControls();
}
