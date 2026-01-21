import process from 'node:process';
import { URL } from 'node:url';
import { API } from '@discordjs/core/http-only';
import { REST } from 'discord.js';
import { loadCommands } from './loaders.js';

const commands = await loadCommands(new URL('../commands/', import.meta.url));
const commandData = [...commands.values()].map((command) => command.data);
commandData.forEach((command) => {
	console.log(`Loaded command: ${command.name}`);
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
const api = new API(rest);

// api.applicationCommands.getGlobalCommands(process.env.APPLICATION_ID!).then(async (existingCommands) => {
// 	console.log('Deleting existing commands: ', existingCommands.length);
// 	for (const command of existingCommands) {
// 		console.log(`Deleting global ${command.name} command.`);
// 		await api.applicationCommands.deleteGlobalCommand(process.env.APPLICATION_ID!, command.id);
// 	}
// });

// api.applicationCommands.bulkOverwriteGlobalCommands(process.env.APPLICATION_ID!, []).then((_) => {
// 	console.log(`Successfully deleted all commands!`);
// });

// api.applicationCommands
// 	.getGuildCommands(process.env.APPLICATION_ID!, '805503440339992597')
// 	.then(async (existingCommands) => {
// 		console.log('Deleting existing commands: ', existingCommands.length);
// 		for (const command of existingCommands) {
// 			console.log(`Deleting global ${command.name} command.`);
// 			await api.applicationCommands.deleteGuildCommand(process.env.APPLICATION_ID!, '805503440339992597', command.id);
// 		}
// 	});

// api.applicationCommands
// 	.bulkOverwriteGuildCommands(process.env.APPLICATION_ID!, '805503440339992597', commandData)
// 	.then((result) => {
// 		console.log(`Successfully registered ${result.length} commands for guild 805503440339992597.`);
// 	});

const result = await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.APPLICATION_ID!, commandData);
console.log(`Successfully registered ${result.length} commands.`);
