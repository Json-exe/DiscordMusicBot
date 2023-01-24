const {SlashCommandBuilder} = require('discord.js');
const {getVoiceConnection} = require("@discordjs/voice");
const main = require("../index");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playoutro')
        .setDescription('Plays outro music. (This will clear the queue!)'),
    async execute(interaction, serverQueue) {
        // Check if the bot is in a voice channel
        const connection = getVoiceConnection(interaction.guildId);
        if (connection === null) {
            return interaction.reply({content: "I'm not in a voice channel!", ephemeral: true});
        }
        // Check if the user is in a voice channel
        if (interaction.member.voice.channel === null) {
            return interaction.reply({content: "You're not in a voice channel!", ephemeral: true});
        }
        // Check if the user is in the same voice channel as the bot
        if (interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            return interaction.reply({content: "You're not in the same voice channel as me!", ephemeral: true});
        }
        // Clear the queue, stop the current song and play the outro
        serverQueue.songs = [];
        serverQueue.audioPlayer.stop(true);
        // Get the outro mp3 file in the bots root directory
        const pathToOutro = require('path').join(__dirname, '../outro.mp3');
        // Play the outro
        await main.play(interaction.guild, pathToOutro)
        return interaction.reply({content: "Playing outro!", ephemeral: true});
    }
}