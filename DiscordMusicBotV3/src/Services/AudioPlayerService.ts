import { inject } from 'inversify';
import { ServiceIdentifiers } from '../util/models.js';
import { Snowflake } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import JasonMusicPlayer from './JasonMusicPlayer.js';

export default class AudioPlayerService {
	private queues: AudioQueue[] = [];

	constructor(
		@inject(ServiceIdentifiers.LavaLinkManager) private readonly lavaLinkManager: LavalinkManager<JasonMusicPlayer>,
	) {}

	public getOrCreateServerQueue(guildId?: Snowflake | null) {
		if (!guildId) return undefined;

		let queue = this.queues.find((queue) => queue.guildId === guildId);
		if (!queue) {
			queue = { guildId, songs: [] };
			this.queues.push(queue);
		}

		return queue;
	}

	public getOrCreatePlayer(guildId: Snowflake, channelId: Snowflake, textChannelId?: Snowflake) {
		return this.lavaLinkManager.createPlayer({
			guildId: guildId,
			voiceChannelId: channelId,
			selfDeaf: true,
			textChannelId: textChannelId,
		});
	}

	public getPlayer(guildId: Snowflake) {
		return this.lavaLinkManager.players.get(guildId);
	}
}

type AudioQueue = {
	guildId: Snowflake;
	songs: Song[];
};

type Song = {
	title: string;
	url: string;
	thumbnail: string;
};
