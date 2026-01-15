import { RESTPostAPIApplicationCommandsJSONBody, CommandInteraction, MessageFlags, GuildMember } from 'discord.js';
import { z } from 'zod';
import type { StructurePredicate } from '../util/loaders.js';

/**
 * Defines the structure of a command
 */
export type Command = {
	/**
	 * The data for the command
	 */
	data: RESTPostAPIApplicationCommandsJSONBody;
	/**
	 * The function to execute when the command is called
	 *
	 * @param interaction - The interaction of the command
	 */
	execute(interaction: CommandInteraction): Promise<void> | void;
};

/**
 * Defines the schema for a command
 */
export const schema = z.object({
	data: z.record(z.any()),
	execute: z.function(),
});

/**
 * Defines the predicate to check if an object is a valid Command type.
 */
export const predicate: StructurePredicate<Command> = (structure: unknown): structure is Command =>
	schema.safeParse(structure).success;

export async function checkVoiceChannelAvailability(interaction: CommandInteraction) {
	const member = interaction.member;
	if (!member || !interaction.guild) {
		await interaction.reply({
			content: 'You need to be in a guild to use this command.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	if (!(member instanceof GuildMember)) {
		await interaction.reply({
			content: 'Member information is not available.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	if (!member.voice.channel) {
		await interaction.reply({
			content: 'You need to be in a voice channel to use this command.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	if (!member.voice.channel.joinable) {
		await interaction.reply({
			content: 'I do not have permission to join your voice channel.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	const permissions = member.voice.channel.permissionsFor(interaction.client.user.id);
	if (permissions && !(permissions.has('Connect') && permissions.has('Speak'))) {
		await interaction.reply({
			content: 'I need permissions to join and speak in your voice channel.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}
