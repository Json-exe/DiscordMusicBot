import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import LinkParserService from '../../Services/LinkParserService.js';
import containerSetup from '../../util/containerSetup.js';
import { ServiceIdentifiers } from '../../util/models.js';

export default {
	data: {
		name: 'play',
		description: 'Play a song from a given URL',
		options: [
			{
				name: 'song',
				description: 'The song to play (URL)',
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		],
	},
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction))) {
			return;
		}

		// const member = interaction.member as GuildMember;
		const songUrl = interaction.options.getString('song');
		if (songUrl && songUrl.length > 0) {
			const parserService = await containerSetup.getAsync<LinkParserService>(ServiceIdentifiers.LinkParserService);
			const parser = parserService.checkLinkSupport(songUrl);
			if (parser) {
				await interaction.deferReply();
				await parser.parseLink(songUrl);
			} else {
				await interaction.reply({
					embeds: [
						new EmbedBuilder().setTitle('Invalid URL Type. Bot only supports YT and Spotify Links!').setColor(0x0000ff),
					],
				});
			}
		}
		await interaction.reply({
			embeds: [
				new EmbedBuilder().setTitle('Invalid URL Type. Bot only supports YT and Spotify Links!').setColor(0x0000ff),
			],
		});
	},
} satisfies Command;
