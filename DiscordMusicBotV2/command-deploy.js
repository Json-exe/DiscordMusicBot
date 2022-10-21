const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');

const commands = [];

const commandFiles = fs.readdirSync('./Commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

// get the args
const args = process.argv.slice(2);

if (args[0] === 'deploy') {
    rest.put(Routes.applicationCommands(clientId), { body: commands }).then(() => console.log('Successfully registered application commands.')).catch(console.error);
} else if (args[0] === 'deploy-guild') {
    rest.put(Routes.applicationGuildCommands(clientId, "994907168484642928"), { body: commands }).then(() => console.log('Successfully registered Guild application commands.')).catch(console.error);
} else if (args[0] === 'delete') {
    rest.get(Routes.applicationCommands(clientId)).then((commands) => {
        for (const command of commands) {
            rest.delete(Routes.applicationCommand(clientId, command.id)).then(() => console.log(`Successfully deleted application command ${command.name}.`)).catch(console.error);
        }
    }).catch(console.error);
} else if (args[0] === 'delete-guild') {
    rest.get(Routes.applicationGuildCommands(clientId, "994907168484642928")).then((commands) => {
        for (const command of commands) {
            rest.delete(Routes.applicationGuildCommand(clientId, "994907168484642928", command.id)).then(() => console.log(`Successfully deleted application command ${command.name}.`)).catch(console.error);
        }
    }).catch(console.error);
} else if (args[0] === 'clean') {
    rest.put(Routes.applicationCommands(clientId), { body: [] }).then(() => console.log('Successfully registered application commands.')).catch(console.error);
    rest.put(Routes.applicationGuildCommands(clientId, "994907168484642928"), { body: [] }).then(() => console.log('Successfully registered Guild application commands.')).catch(console.error);
} else {
    console.log('Invalid command');
}
