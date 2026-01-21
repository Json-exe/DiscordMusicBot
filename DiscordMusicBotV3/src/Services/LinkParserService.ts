import { ServiceIdentifiers } from '../util/models.js';
import { Snowflake, User } from 'discord.js';
import container from '../util/containerSetup.js';
import JasonMusicPlayer from './JasonMusicPlayer.js';

export default class LinkParserService {
	public async checkLinkSupport(link: string): Promise<ILinkParser | undefined> {
		const parsers = await container.getAllAsync<ILinkParser>(ServiceIdentifiers.LinkParsers);
		return parsers.find((parser) => parser.supportsLink(link));
	}
}

export interface ILinkParser {
	parseLink(
		link: string,
		guildId: Snowflake,
		channelId: Snowflake,
		requestUser: User,
		textChannelId?: Snowflake,
	): Promise<JasonMusicPlayer | undefined>;
	supportsLink(link: string): boolean;
}
