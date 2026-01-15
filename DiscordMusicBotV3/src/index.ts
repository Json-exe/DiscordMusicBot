import process from 'node:process';
import { URL } from 'node:url';
import { Client, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './util/loaders.js';
import container from './util/containerSetup.js';
import { LavalinkManager } from 'lavalink-client';
import { ServiceIdentifiers } from './util/models.js';
import { generateDependencyReport } from '@discordjs/voice';

console.log('Bootstrapping Discord bot…', process.env.DISCORD_TOKEN ? 'token ok' : 'token fehlt');
process.on('unhandledRejection', (err) => console.error('Unhandled rejection', err));

// Initialize the client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
container.bind(ServiceIdentifiers.Client).toConstantValue(client);

const manager = new LavalinkManager({
	nodes: [
		{
			authorization: 'youshallnotpass',
			host: 'localhost',
			port: 2333,
			id: 'testnode',
		},
	],
	sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
	autoSkip: true,
	client: {
		id: process.env.APPLICATION_ID ?? '000000000000000000',
		username: 'JasonMusic',
	},
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
