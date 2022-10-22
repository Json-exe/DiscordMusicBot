const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const main = require("../index");
const {getVoiceConnection} = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song.')
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of songs to skip.').setRequired(false)),
    async execute(interaction, serverQueue) {
        if (!interaction.member.voice.channel)
            return await interaction.reply(
                "You have to be in a voice channel to stop the music!"
            );

        if (!serverQueue || serverQueue.songs.length === 0)
            return await interaction.reply("There is no song that I could skip! Add some to the queue!");

        // Get the voice connection of the bot in the guild
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection.joinConfig.channelId !== interaction.member.voice.channelId)
            return await interaction.reply("You have to be in the same voice channel as the bot to skip songs!");

        // Skip the given number of songs
        // Check if interaction.options.getInteger('amount') is null
        if (interaction?.options?.getInteger('amount') !== undefined) {
            const skipCount = interaction.options.getInteger('amount');
            if (skipCount > serverQueue.songs.length) {
                return await interaction.reply(`There are only ${serverQueue.songs.length} songs in the queue!`);
            } else if (skipCount < 1) {
                return await interaction.reply("You can't skip less than 1 song!");
            } else {
                serverQueue.songs.splice(0, skipCount);
                await main.play(interaction.guild, serverQueue.songs[0]);
                return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Skipped ${skipCount} songs.`).setColor(0x0000ff) ] });
            }
        } else {
            // Check if there is a song to skip
            if (serverQueue.songs.length === 1) {
                return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("There is no song to skip!").setColor(0xff0000) ] });
            }
            serverQueue.songs.shift();
            await main.play(interaction.guild, serverQueue.songs[0]);
            return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Skipped the current song.").setColor(0x0000ff) ] });
        }
    }
}