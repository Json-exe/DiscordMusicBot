const { SlashCommandBuilder } = require('discord.js');
const {getVoiceConnection} = require("@discordjs/voice");
const {setTimeout: wait} = require("node:timers/promises");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-music-channel')
        .setDescription('Reset the music channel to the current channel'),
    async execute(interaction, serverQueue) {
        // Check if the server queue is existent
        if (!serverQueue) {
            return interaction.reply({content: "There is no music playing!", ephemeral: true});
        }
        // Check if the user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({content: "You need to be in a voice channel to use this command!", ephemeral: true});
        }
        // Get the voice connection of the bot in the guild
        const connection = await getVoiceConnection(interaction.guild.id);

        if (connection.joinConfig.channelId !== interaction.member.voice.channelId) {
            await wait(1000);
            return await interaction.editReply("You have to be in the same voice channel as the bot to set the music channel!");
        }
        // Set the text channel to the current channel
        serverQueue.textChannel = interaction.channel;
        // Send a message to the channel
        return interaction.reply({content: "The music channel has been set to this channel!", ephemeral: true});
    }
}