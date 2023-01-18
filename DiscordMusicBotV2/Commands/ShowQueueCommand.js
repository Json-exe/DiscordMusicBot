const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');

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
            .setDescription(serverQueue.songs.map((song, index) => `${index + 1}. ${song.title ? song.title : song.url}`).slice(0, 10).join('\n'))
            .setFooter({ text: `Total songs in queue: ${serverQueue.songs.length}` });
        return interaction.reply({ embeds: [queueEmbed] });
    }
}