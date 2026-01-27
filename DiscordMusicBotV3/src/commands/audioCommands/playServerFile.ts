import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { checkVoiceChannelAvailability, Command } from '../index.js';
import container from '../../util/containerSetup.js';
import { ServiceIdentifiers } from '../../util/models.js';
import AudioPlayerService from '../../Services/AudioPlayerService.js';
import { isGuildMemberChatGuard } from '../utility/utilities.js';
import path from 'node:path';
import fs from 'node:fs';

export default {
	data: new SlashCommandBuilder()
		.setName('play-server-file')
		.setDescription('Plays a file from the server.')
		.addStringOption((option) => option.setName('file').setDescription('The file name to play.').setRequired(true))
		.toJSON(),
	async execute(interaction: CommandInteraction) {
		if (!interaction.isChatInputCommand()) return;
		if (!(await checkVoiceChannelAvailability(interaction)) || !isGuildMemberChatGuard(interaction.member)) {
			return;
		}

		if (!interaction.member.voice.channel || !interaction.guildId) {
			return;
		}

		const fileName = interaction.options.getString('file');
		if (!fileName) return;

		const music_dir = process.env.MUSIC_DIRECTORY;
		if (!music_dir) throw new Error('MUSIC_DIRECTORY is not defined in environment variables');

		const dir = path.resolve(music_dir);
		const filePath = path.join(dir, fileName + '.mp3');
		if (!fs.existsSync(filePath)) {
			await interaction.reply({ content: `File does not exist: ${fileName}`, flags: MessageFlags.Ephemeral });
			return;
		}

		const serverBasePath = '/opt/Lavalink/local_music/';
		const serverPath = path.posix.join(serverBasePath, fileName + '.mp3');
		const audioService = await container.getAsync<AudioPlayerService>(ServiceIdentifiers.AudioPlayerService);
		const player = audioService.getOrCreatePlayer(
			interaction.guildId,
			interaction.member.voice.channel.id,
			interaction.channelId,
		);
		const result = await player.search(
			{
				source: 'local',
				query: serverPath,
			},
			interaction.user,
		);

		if (result.loadType === 'error' || result.loadType === 'empty') {
			await interaction.reply({ content: `Could not find file: ${fileName}`, flags: MessageFlags.Ephemeral });
			return;
		}

		await interaction.reply({ content: `Playing: ${fileName}` });
		player.queue.add(result.tracks[0]);
		await player.connect();
		await player.play();
	},
} satisfies Command;
