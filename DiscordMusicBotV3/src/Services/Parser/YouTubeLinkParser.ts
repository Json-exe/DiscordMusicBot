import { ILinkParser } from '../LinkParserService.js';
import { Snowflake, User } from 'discord.js';
import AudioPlayerService from '../AudioPlayerService.js';
import { inject } from 'inversify';
import { ServiceIdentifiers } from '../../util/models.js';

export default class YouTubeLinkParser implements ILinkParser {
	constructor(@inject(ServiceIdentifiers.AudioPlayerService) private readonly audioService: AudioPlayerService) {}

	supportsLink(link: string): boolean {
		const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
		if (!ytRegex.test(link)) return false;
		// We do not support playlist links that contain index or watch parameters!
		return !(link.includes('list=') && (link.includes('index=') || link.includes('watch')));
	}

	async parseLink(
		link: string,
		guildId: Snowflake,
		channelId: Snowflake,
		requestUser: User,
		textChannelId?: Snowflake,
	) {
		if (!this.supportsLink(link))
			throw new Error('YouTubeLinkParser requires a valid link! Be sure to call supportsLink first.');

		const player = this.audioService.getOrCreatePlayer(guildId, channelId, textChannelId);
		console.log(`Playing YouTube link: ${link}`);
		const searchResult = await player.search(
			{
				query: link,
			},
			requestUser,
		);
		if (searchResult.loadType === 'error' || searchResult.loadType === 'empty') {
			throw new Error('Could not find video!');
		}

		if (searchResult.loadType === 'track') {
			player.queue.add(searchResult.tracks[0]);
		} else if (searchResult.loadType === 'playlist') {
			player.queue.add(searchResult.tracks);
		} else {
			throw new Error('Could not find content for this link!');
		}

		return player;
	}
}
