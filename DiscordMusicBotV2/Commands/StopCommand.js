const { SlashCommandBuilder } = require('discord.js');
const {getVoiceConnection} = require("@discordjs/voice");
const main = require("../index.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and leaves the voice channel.'),
    async execute(interaction, serverQueue) {
        if (!interaction.member.voice.channel)
            return await interaction.reply(
                "You have to be in a voice channel to stop the music!"
            );

        if (!serverQueue?.connection) {
            // Get the voice connection of the bot
            const connection = await getVoiceConnection(interaction.guild.id);
            if (!connection) return await interaction.reply("Im not in a voice channel!");
            // Destroy the voice connection
            connection.destroy();
            await console.log("Left voice channel on Server " + interaction.guild.name);
            return await interaction.reply("Left your voice Channel!");
        }

        if (main.x) {
            clearInterval(main.x);
        }

        await console.log("Left voice channel on Server " + interaction.guild.name);
        serverQueue.songs = [];
        serverQueue.connection.destroy();
        serverQueue.audioPlayer = null;
        await interaction.reply("Destroyed the player!");
    }
}