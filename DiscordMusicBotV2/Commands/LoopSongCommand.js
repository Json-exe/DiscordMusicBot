const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loops the current song.'),
    async execute(interaction, serverQueue) {
        if (!serverQueue) return await interaction.reply('There is no song playing right now!');
        serverQueue.loop = !serverQueue.loop;
        await interaction.reply(`Looping is now ${serverQueue.loop ? 'enabled' : 'disabled'}.`);
    }
}