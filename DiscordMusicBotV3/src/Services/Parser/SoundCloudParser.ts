import { Snowflake, User } from 'discord.js';
import { ILinkParser, ParsedLinkResult } from '../LinkParserService.js';
import { ServiceIdentifiers } from '../../util/models.js';
import AudioPlayerService from '../AudioPlayerService.js';
import { inject } from 'inversify';

export default class SoundCloudParser implements ILinkParser {
	constructor(@inject(ServiceIdentifiers.AudioPlayerService) private readonly audioService: AudioPlayerService) {}

	async parseLink(
		link: string,
		guildId: Snowflake,
		channelId: Snowflake,
		requestUser: User,
		textChannelId?: Snowflake,
	): Promise<ParsedLinkResult | undefined> {
		if (!this.supportsLink(link))
			throw new Error('SoundCloudParser requires a valid link! Be sure to call supportsLink first.');

		const player = this.audioService.getOrCreatePlayer(guildId, channelId, textChannelId);
		console.log(`Playing SoundCloud link: ${link}`);
		const searchResult = await player.search(
			{
				query: link,
			},
			requestUser,
		);

		if (searchResult.loadType === 'error' || searchResult.loadType === 'empty') {
			throw new Error('Could not find SoundCloud track!');
		}

		if (searchResult.loadType === 'track') {
			player.queue.add(searchResult.tracks[0]);
		} else if (searchResult.loadType === 'playlist') {
			player.queue.add(searchResult.tracks);
		} else {
			throw new Error('Could not find content for this link!');
		}

		return {
			player: player,
			result: searchResult,
		};
	}
	supportsLink(link: string): boolean {
		const soundCloudRegex = /^(https?:\/\/)?(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)+/;
		return soundCloudRegex.test(link);
	}
}
