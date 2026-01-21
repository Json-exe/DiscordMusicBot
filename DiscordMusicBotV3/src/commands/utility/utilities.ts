import { GuildMember } from 'discord.js';

export function isGuildMemberChatGuard(member: any): member is GuildMember {
	return member && member instanceof GuildMember;
}
