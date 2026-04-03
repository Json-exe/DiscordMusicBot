import { Snowflake, User } from 'discord.js';
import { ILinkParser, ParsedLinkResult } from '../LinkParserService.js';
import AudioPlayerService from '../AudioPlayerService.js';
import { ServiceIdentifiers } from '../../util/models.js';
import { inject } from 'inversify';

export default class AudioFileParser implements ILinkParser {
	constructor(@inject(ServiceIdentifiers.AudioPlayerService) private readonly audioService: AudioPlayerService) {}

	async parseLink(
		link: string,
		guildId: Snowflake,
		channelId: Snowflake,
		requestUser: User,
		textChannelId?: Snowflake,
	): Promise<ParsedLinkResult | undefined> {
		if (!this.supportsLink(link)) {
			throw new Error('AudioFileParser requires a valid link! Be sure to call supportsLink first.');
		}

		const player = this.audioService.getOrCreatePlayer(guildId, channelId, textChannelId);
		console.log(`Playing direct link: ${link}`);
		const searchResult = await player.search(
			{
				query: link,
			},
			requestUser,
		);

		if (searchResult.loadType === 'error' || searchResult.loadType === 'empty') {
			throw new Error('Could not load direct link!');
		}

		if (searchResult.loadType === 'track') {
			player.queue.add(searchResult.tracks[0]);
		} else {
			throw new Error('Could not find content for this link!');
		}

		return {
			player: player,
			result: searchResult,
		};
	}

	supportsLink(link: string): boolean {
		try {
			const url = new URL(link);
			if (url.protocol !== 'https:') return false;

			const pathname = url.pathname.toLowerCase();
			return pathname.endsWith('.mp3') || pathname.endsWith('.ogg');
		} catch {
			return false;
		}
	}
}
