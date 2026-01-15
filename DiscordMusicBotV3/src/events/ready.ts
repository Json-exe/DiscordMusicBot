import { Events } from 'discord.js';
import type { Event } from './index.js';
import container from '../util/containerSetup.js';
import { LavalinkManager } from 'lavalink-client';
import { ServiceIdentifiers } from '../util/models.js';

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		const manager = await container.getAsync<LavalinkManager>(ServiceIdentifiers.LavaLinkManager);
		await manager.init({
			id: client.user.id,
			username: client.user.username,
		});
	},
} satisfies Event<Events.ClientReady>;
