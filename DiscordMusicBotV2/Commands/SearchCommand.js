const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {joinVoiceChannel} = require("@discordjs/voice");
const main = require("../index");
const queue = require("../index.js").queue;
const wait = require('node:timers/promises').setTimeout;
const {search, video_info} = require('play-dl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Searches for a song on YouTube.')
        .addStringOption(option => option.setName('search-pattern').setDescription('The text you want to use to search').setRequired(true)),
        async execute(interaction, serverQueue) {
            // Get the search pattern from the interaction
            const searchPattern = interaction.options.getString('search-pattern');
            const channel = interaction.member.voice.channel;
            if (!channel) return interaction.reply('You need to join a voice channel first!');
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
                return interaction.reply('I need the permissions to join and speak in your voice channel!');
            }
            let searchResult = await search(searchPattern, {limit: 10, unblurNSFWThumbnails: true, source: { youtube: "video" }});
            let embed = new EmbedBuilder();
            embed.setTitle("Search Results");
            embed.setDescription("Copy the url of the video you want to play and send it by using the /play command.");
            let fields = [];
            for (let i = 0; i < searchResult.length; i++) {
                fields.push({ name: (i + 1).toString(), value: searchResult[i].title + " - " + searchResult[i].url, inline: true });
            }
            embed.addFields(fields);
            return await interaction.reply({ embeds: [embed] });
        }
    }