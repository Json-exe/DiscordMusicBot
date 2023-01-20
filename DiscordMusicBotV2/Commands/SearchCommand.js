const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const {joinVoiceChannel, VoiceConnectionStatus} = require("@discordjs/voice");
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
            // Create here the options for the select menu
            let options = [];
            for (let i = 0; i < searchResult.length; i++) {
                options.push({ label: (i + 1).toString(), value: searchResult[i].url, description: searchResult[i].title });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('search')
                        .setPlaceholder('Select a song')
                        .addOptions(
                            options
                        )
                );

            await interaction.reply({ embeds: [embed], components: [row] });
            const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.StringSelectMenu, time: 15000 });
            collector.on('collect', async i => {
                if (i.user.id === interaction.user.id) {
                    await play(interaction, i.values[0], serverQueue);
                    collector.stop();
                } else {
                    await i.reply({content: `You can't select this option`, ephemeral: true});
                }
            });
        }
    }

    async function play(interaction, songURL, serverQueue) {
        const songInfo = await video_info(songURL);
        const song = {
            title: songInfo.video_details.title,
            url: songInfo.video_details.url,
            duration: songInfo.video_details.durationInSec,
            requestedBy: interaction.member,
            thumbnail: songInfo.video_details.thumbnails[0].url
        };

        // Create the added to queue embed
        const addedToQueueEmbed = new EmbedBuilder()
            .setTitle('ADDED TO QUEUE')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${song.title}\``)
            .setThumbnail(song.thumbnail)
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(song.duration)}`, inline: true},
                {name: ":hash:Position", value: `❯ ${serverQueue?.songs?.length > 0 ? serverQueue.songs.length : 1}`, inline: true}
            );

        let queueConstruct = {
            textChannel: interaction.channel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
            audioPlayer: null,
            loop: false
        };

        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            await queue.set(interaction.guild.id, queueConstruct);
            queueConstruct.songs.push(song);
            try {
                const channel = await interaction.member.voice.channel;
                queueConstruct.connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: await channel.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });
                await console.log("Joined Voice Channel " + channel.name);
                await main.play(interaction.guild, queueConstruct.songs[0]);
                return await interaction.editReply({embeds: [addedToQueueEmbed], components: []});
            } catch (err) {
                await console.log(err);
                queue.delete(interaction.guild.id);
                return await interaction.editReply("Error Occurred: " + err);
            }
        } else {
            serverQueue.songs.push(song);
            return await interaction.editReply({embeds: [addedToQueueEmbed], components: []});
        }
    }