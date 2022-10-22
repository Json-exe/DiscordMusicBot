const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loops the current song.'),
    async execute(interaction, serverQueue) {
        if (!serverQueue) return await interaction.reply('There is no song playing right now!');
        serverQueue.loop = !serverQueue.loop;
        await interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Looping ${serverQueue.loop ? 'enabled' : 'disabled'}.`).setColor(0x0000ff) ] });
    }
}