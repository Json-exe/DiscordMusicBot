import { ServiceIdentifiers } from '../util/models.js';
import { Snowflake, User } from 'discord.js';
import container from '../util/containerSetup.js';
import JasonMusicPlayer from './JasonMusicPlayer.js';
import { SearchResult, UnresolvedSearchResult } from 'lavalink-client';

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
	): Promise<ParsedLinkResult | undefined>;
	supportsLink(link: string): boolean;
}

export type ParsedLinkResult = {
	player: JasonMusicPlayer;
	result: UnresolvedSearchResult | SearchResult;
};
