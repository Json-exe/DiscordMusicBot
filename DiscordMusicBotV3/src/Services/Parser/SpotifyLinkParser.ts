import { Snowflake, User } from 'discord.js';
import { ILinkParser, ParsedLinkResult } from '../LinkParserService.js';
import { ServiceIdentifiers } from '../../util/models.js';
import AudioPlayerService from '../AudioPlayerService.js';
import { inject } from 'inversify';

export default class SpotifyLinkParser implements ILinkParser {
	constructor(@inject(ServiceIdentifiers.AudioPlayerService) private readonly audioService: AudioPlayerService) {}

	async parseLink(
		link: string,
		guildId: Snowflake,
		channelId: Snowflake,
		requestUser: User,
		textChannelId?: Snowflake,
	) {
		if (!this.supportsLink(link))
			throw new Error('SpotifyLinkParser requires a valid link! Be sure to call supportsLink first.');

		const player = this.audioService.getOrCreatePlayer(guildId, channelId, textChannelId);
		console.log(`Playing Spotify link: ${link}`);
		const searchResult = await player.search(
			{
				query: link,
			},
			requestUser,
		);

		if (searchResult.loadType === 'error' || searchResult.loadType === 'empty') {
			throw new Error('Could not find spotify track!');
		}

		if (searchResult.loadType === 'track') {
			player.queue.add(searchResult.tracks[0]);
		} else if (searchResult.loadType === 'playlist') {
			player.queue.add(searchResult.tracks);
		} else {
			throw new Error('Could not find content for this link!');
		}

		const resultType: ParsedLinkResult = {
			player: player,
			result: searchResult,
		};

		return resultType;
	}

	supportsLink(link: string): boolean {
		const spotifyRegex =
			/^(https?:\/\/)?(www\.)?open\.spotify\.com\/(intl-[a-zA-Z]+\/)?(track|album|playlist)\/[a-zA-Z0-9]+/;
		return spotifyRegex.test(link);
	}
}
