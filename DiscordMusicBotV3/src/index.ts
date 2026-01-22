import process from 'node:process';
import { URL } from 'node:url';
import { Client, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './util/loaders.js';
import container from './util/containerSetup.js';
import { LavalinkManager } from 'lavalink-client';
import { ServiceIdentifiers } from './util/models.js';
import { generateDependencyReport } from '@discordjs/voice';
import JasonMusicPlayer from './Services/JasonMusicPlayer.js';

console.log('Bootstrapping Discord bot…', process.env.DISCORD_TOKEN ? 'token ok' : 'token fehlt');
process.on('unhandledRejection', (err) => console.error('Unhandled rejection', err));

// Initialize the client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
container.bind(ServiceIdentifiers.Client).toConstantValue(client);

const manager = new LavalinkManager<JasonMusicPlayer>({
	nodes: [
		{
			authorization: 'youshallnotpass',
			host: 'localhost',
			port: 2333,
			id: 'testnode',
			enablePingOnStatsCheck: true,
		},
	],
	sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
	autoSkip: true,
	client: {
		id: process.env.APPLICATION_ID ?? '000000000000000000',
		username: 'JasonMusic',
	},
	playerClass: JasonMusicPlayer,
	autoSkipOnResolveError: true,
	playerOptions: {
		onEmptyQueue: {
			destroyAfterMs: 900_000,
		},
	},
});
manager.on('queueEnd', async (player) => {
	if (!player.connected) return;
	console.log(`Queue ended for guild ${player.guildId}, starting end timer.`);
	await player.startQueueEndTimer(client);
});
manager.on('trackStart', async (player) => {
	console.log(`Track started for guild ${player.guildId}.`);
	player.stopQueueEndTimer();
	await player.sendNpMessage(client);
});
manager.on('playerVoiceLeave', async (player) => {
	console.log(`Player left voice channel for guild ${player.guildId}.`);
	if (!player.voiceChannelId) return;
	const channel = client.channels.cache.get(player.voiceChannelId);
	if (!channel || !channel.isVoiceBased()) return;
	if (channel.members.size === 1) {
		console.log(`Voice channel is empty, stopping and destroying player in guild: ${player.guildId}.`);
		player.stopQueueEndTimer();
		await player.destroy('No members left in voice channel');
	}
});
container.bind(ServiceIdentifiers.LavaLinkManager).toConstantValue(manager);

// Load the events and commands
const events = await loadEvents(new URL('events/', import.meta.url));

// Register the event handlers
for (const event of events) {
	client[event.once ? 'once' : 'on'](event.name, async (...args) => {
		try {
			await event.execute(...args);
		} catch (error) {
			console.error(`Error executing event ${String(event.name)}:`, error);
		}
	});
}

// Login to the client
console.log(generateDependencyReport());
console.log('Logging in to Discord...');
void client.login(process.env.DISCORD_TOKEN);
client.on('raw', async (d) => await manager.sendRawData(d));
