const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {version} = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showqueue')
        .setDescription('Shows the first 10 songs in the queue'),
    async execute(interaction, serverQueue) {
        if (!serverQueue) return interaction.reply('There is nothing playing.');
        // Build an embed with the queue.
        const queueEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('The first 10 songs in the queue are:')
            .setThumbnail(serverQueue.songs[0].thumbnail)
            .setDescription(serverQueue.songs.map((song, index) => `${index + 1}. ${song.title ? song.title : song.url}`).slice(0, 10).join('\n'))
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"});
        return interaction.reply({ embeds: [queueEmbed] });
    }
}