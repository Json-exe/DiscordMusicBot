import {
	ActionRowBuilder,
	CommandInteraction,
	Interaction,
	MessageFlags,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import container from '../../util/containerSetup.js';
import AudioPlayerService from '../../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from '../../util/models.js';
import { SearchPlatform } from 'lavalink-client';

export default {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for a song on a specific source.')
		.addStringOption((option) => option.setName('query').setDescription('The song to search for.').setRequired(true))
		.addStringOption((option) =>
			option.setName('source').setDescription('The source to search on.').setRequired(true).addChoices(
				{
					name: 'YouTube',
					value: 'youtube',
				},
				{
					name: 'SoundCloud',
					value: 'soundcloud',
				},
				{
					name: 'Spotify',
					value: 'spotify',
				},
			),
		)
		.toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}
		if (!interaction.guildId || !interaction.member.voice.channelId) {
			return;
		}

		const query = interaction.options.getString('query');
		const source = interaction.options.getString('source');

		if (!query || !source) return;

		const response = await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
			withResponse: true,
		});

		const sourcePlatform: SearchPlatform =
			source === 'youtube' ? 'youtube' : source === 'soundcloud' ? 'soundcloud' : 'spotify';

		const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
		const player = audioService.getOrCreatePlayer(
			interaction.guildId,
			interaction.member.voice.channelId,
			interaction.channelId,
		);
		const result = await player.search(
			{
				query: query,
				source: sourcePlatform,
			},
			interaction.user,
		);

		if (result.loadType === 'error' || result.loadType === 'empty') {
			await interaction.editReply({ content: `Could not find ${query} on ${source}!` });
			return;
		}

		const options = result.tracks
			.map((track) => {
				const value = track.info.identifier ?? track.info.uri;
				if (value) {
					return new StringSelectMenuOptionBuilder()
						.setLabel(`${track.info.title} - ${track.info.author}`)
						.setValue(value)
						.toJSON();
				}

				return;
			})
			.filter((opt) => opt !== undefined);
		if (options.length === 0) {
			await interaction.editReply({ content: `Could not find ${query} on ${source}!` });
			return;
		}

		const select = new StringSelectMenuBuilder()
			.setCustomId('search-select')
			.setPlaceholder('Select a song to play!')
			.addOptions(options.slice(0, 10))
			.setMaxValues(1);

		const row = new ActionRowBuilder().addComponents(select).toJSON();
		await interaction.editReply({ content: `Select a song to play!`, components: [row] });

		const collectionFilter = (i: Interaction) => i.user.id === interaction.user.id;

		try {
			const confirmation = await response.resource?.message?.awaitMessageComponent({
				filter: collectionFilter,
				time: 60000,
			});
			if (!confirmation) {
				return;
			}
			if (confirmation.customId !== 'search-select' || !confirmation.isStringSelectMenu()) {
				await confirmation.update({
					content: 'You did not made a selection in time. Operation canceled.',
					components: [],
				});
				return;
			}
			const value = confirmation.values[0];
			const track =
				result.tracks.find((track) => track.info.identifier === value || track.info.uri === value) ?? result.tracks[0];
			player.queue.add(track);
			await confirmation.update({ content: `Added ${track.info.title} to the queue!`, components: [] });
			await player.startPlayerIfNeeded();
		} catch (err) {
			console.error(err);
			await interaction.editReply({
				content: 'You did not made a selection in time. Operation canceled.',
				components: [],
				embeds: [],
			});
		}
	},
} satisfies Command;
