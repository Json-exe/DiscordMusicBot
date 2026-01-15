import { CommandInteraction, EmbedBuilder, MessageFlagsBitField } from 'discord.js';
import { Command } from '../index.js';
import { footerOptions } from '../../util/utilities.js';

export default {
	data: {
		name: 'changelog',
		description: 'Display the latest changelog information',
	},
	async execute(interaction: CommandInteraction) {
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Changelog for ${process.env.VERSION}`)
					.setDescription(process.env.CHANGELOG ?? 'No changelog available.')
					.setFooter(footerOptions)
					.setColor(0x0000ff),
			],
			flags: MessageFlagsBitField.Flags.Ephemeral,
		});
	},
} satisfies Command;
