const { REST, SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');
const { clientId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('join-voice').setDescription('Joins the voice channel of the user who sent the command.'),
    new SlashCommandBuilder().setName('leave-voice').setDescription('Leaves the voice channel of the user who sent the command.'),
    new SlashCommandBuilder().setName('play').setDescription('Plays a song in the voice channel of the user who sent the command.').addStringOption(option => option.setName('song').setDescription('The song to play.').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Skips the current song.').addIntegerOption(option => option.setName('amount').setDescription('The amount of songs to skip.').setRequired(false)),
    new SlashCommandBuilder().setName('stop').setDescription('Stops the music and leaves the voice channel.'),
    new SlashCommandBuilder().setName('play-server-file').setDescription('Plays a file from the server.').addStringOption(option => option.setName('filename').setDescription('The name of the file to play.').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('available-server-music').setDescription('Lists all available music files on the server.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('changelog').setDescription('Shows the changelog of the bot.'),
    new SlashCommandBuilder().setName('pause-unpause').setDescription('Pauses or unpauses the current song.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

// get the args
const args = process.argv.slice(2);

// rest.put(Routes.applicationCommands(clientId), { body: commands }).then(() => console.log('Successfully registered application commands.')).catch(console.error);

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
} else {
    console.log('Invalid command');
}
