const {SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause-unpause')
        .setDescription('Pauses or unpauses the current song.'),
    async execute(interaction, serverQueue) {
        if (!serverQueue || serverQueue.songs.length === 0) return await interaction.reply("There is no song playing!");
        // Return if executing user is not in the same voice channel as the bot
        if (interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return await interaction.reply("You are not in the same voice channel as the bot!");
        if (serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.audioPlayer.pause();
            await interaction.reply("Song paused!");
        } else {
            serverQueue.playing = true;
            serverQueue.audioPlayer.unpause();
            await interaction.reply("Song unpaused!");
        }
    }
}