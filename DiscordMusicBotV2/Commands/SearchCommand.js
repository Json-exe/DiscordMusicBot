const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const {joinVoiceChannel, VoiceConnectionStatus} = require("@discordjs/voice");
const main = require("../index");
const queue = require("../index.js").queue;
const {search, video_info} = require('play-dl');
const {version} = require("../config.json");

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
            if (searchResult.length === 0) return interaction.reply("No results found.");
            let embed = new EmbedBuilder();
            embed.setTitle("Search Results (Top 10)");
            embed.setDescription("Select the song you want to play.");
            embed.setThumbnail(searchResult[0].thumbnails[0].url);
            embed.setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"});
            let fields = [];
            for (let i = 0; i < searchResult.length; i++) {
                fields.push({ name: ` `, value: `${i+1}) [${searchResult[i].title}](${searchResult[i].url}) - ${await main.convertSecondsToTime(searchResult[i].durationInSec)}`, inline: false });
            }
            embed.addFields(fields);
            // Create here the options for the select menu
            let options = [];
            for (let i = 0; i < searchResult.length; i++) {
                options.push({ label: searchResult[i].title, value: searchResult[i].url, description: `Duration: ${await main.convertSecondsToTime(searchResult[i].durationInSec)}`, emoji: "🎵" });
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
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await interaction.editReply({embeds: [embed], components: []});
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
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(song.duration)}`, inline: true},
                {name: ":hash:Position", value: `❯ ${serverQueue?.songs?.length > 0 ? serverQueue.songs.length : 1}`, inline: true}
            );

        let queueConstruct = {
            textChannel: interaction.channel,
            connection: null,
            songs: [],
            volume: 1,
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