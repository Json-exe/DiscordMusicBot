const {SlashCommandBuilder} = require('discord.js');
const {getVoiceConnection} = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause-unpause')
        .setDescription('Pauses or unpauses the current song.'),
    async execute(interaction, serverQueue) {
        if (!serverQueue || serverQueue.songs.length === 0) return await interaction.reply("There is no song playing!");
        // Return if executing user is not in a voice channel
        if (!interaction.member.voice.channel) return await interaction.reply("You need to be in a voice channel to pause or unpause the music!");
        // Get the voice connection of the bot in the guild
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection.joinConfig.channelId !== interaction.member.voice.channelId)
            return await interaction.reply("You have to be in the same voice channel as the bot to skip songs!");
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