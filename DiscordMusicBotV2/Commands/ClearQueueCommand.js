const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {getVoiceConnection} = require("@discordjs/voice");
const {version} = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clears the queue'),
    async execute(interaction, serverQueue) {
        if (!interaction.member.voice.channel) return interaction.reply({ embeds: [ new EmbedBuilder().setTitle("You need to be in a voice channel to use this command!").setColor(0xff0000) ]});
        if (!serverQueue) return interaction.reply({ embeds: [ new EmbedBuilder().setTitle("There is no song to skip!").setColor(0xff0000) ] });

        // Get the voice connection of the bot in the guild
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection.joinConfig.channelId !== interaction.member.voice.channelId)
            return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("You need to be in the same voice channel as the bot to use this command!").setColor(0xff0000) ]});

        serverQueue.songs = [serverQueue.songs[0]];
        serverQueue.loop = false;

        await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Cleared the queue!").setColor(0x00ff00).setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"}) ]});
    }
}