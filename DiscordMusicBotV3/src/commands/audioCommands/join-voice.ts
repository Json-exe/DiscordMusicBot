import { CommandInteraction, GuildMember, MessageFlagsBitField } from 'discord.js';
import { Command } from '../index.js';
import { joinVoiceChannel } from '@discordjs/voice';

export default {
	data: {
		name: 'join-voice',
		description: 'Join the voice channel you are in',
	},
	async execute(interaction: CommandInteraction) {
		const member = interaction.member;
		if (member && member instanceof GuildMember) {
			const voiceChannel = member.voice.channel;
			if (!voiceChannel) {
				await interaction.reply({
					content: 'You need to be in a voice channel for me to join!',
					flags: MessageFlagsBitField.Flags.Ephemeral,
				});
				return;
			}
			if (!voiceChannel.joinable) {
				await interaction.reply({
					content: 'I cannot join your voice channel! Do I have the correct permissions?',
					flags: MessageFlagsBitField.Flags.Ephemeral,
				});
				return;
			}

			joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: voiceChannel.guildId,
				adapterCreator: voiceChannel.guild.voiceAdapterCreator,
				selfMute: false,
			});

			console.log('Joined voice channel:', voiceChannel.name);
			await interaction.reply(`Joined voice channel: ${voiceChannel.name}`);
		} else {
			await interaction.reply({
				content: 'This command can only be used in a guild by a member!',
				flags: MessageFlagsBitField.Flags.Ephemeral,
			});
			return;
		}
	},
} satisfies Command;
