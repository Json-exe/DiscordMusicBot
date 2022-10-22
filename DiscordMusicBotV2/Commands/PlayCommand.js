const {SlashCommandBuilder} = require('discord.js');
const {VoiceConnectionStatus, joinVoiceChannel} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const main = require("../index");
const queue = require("../index.js").queue;

module.exports = {
    data: new SlashCommandBuilder()
            .setName('play')
            .setDescription('Plays a song in the voice channel of the user who sent the command.')
            .addStringOption(option => option.setName('song').setDescription('The song to play.').setRequired(true)),
    async execute(interaction, serverQueue) {
        const voiceChannel = await interaction.member.voice.channel;
        if (!voiceChannel)
            return await interaction.reply(
                "You need to be in a voice channel to play music!"
            );

        if (!voiceChannel.joinable) return await interaction.reply('I cannot join your voice channel! Check the permissions please!');

        const permissions = await voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return await interaction.reply(
                "I need the permissions to join and speak in your voice channel!"
            );
        }

        const failedSongs = [];
        const songURL = interaction.options.getString('song');
        let songInfo;

        interaction.deferReply();

        // Get all songs from the playlist if the URL is a playlist
        if (songURL.includes("list=")) {
            // Get the playlist ID from the URL
            const playlistID = songURL.split("list=")[1];
            var playlist;
            try {
                playlist = await ytpl(playlistID);
            } catch (error) {
                await console.log(error);
                return await interaction.editReply("Failed to load Playlist. Please check the URL and try again!");
            }
            songInfo = playlist.items.map(item => item.url);
            serverQueue = await queue.get(interaction.guild.id);
            if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
                serverQueue.songs.length === 0) {
                try {
                    var firstSong = songInfo[0];
                    if (firstSong.includes("list=")) {
                        // Get only the video id
                        firstSong = firstSong.split("&list=")[0];
                    }
                    firstSong = await ytdl.getInfo(firstSong);
                } catch (error) {
                    await console.error(error);
                    failedSongs.push("Failed adding song: " + firstSong);
                }
                const song = {
                    title: firstSong.videoDetails.title,
                    url: firstSong.videoDetails.video_url,
                };
                const queueContruct = {
                    textChannel: interaction.channel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true,
                    audioPlayer: null,
                    loop: false
                };
                await queue.set(interaction.guild.id, queueContruct);
                queueContruct.songs.push(song);
                try {
                    const channel = await interaction.member.voice.channel;
                    var connection = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: await channel.guild.voiceAdapterCreator,
                        selfDeaf: false,
                        selfMute: false
                    });
                    await console.log("Joined Voice Channel " + channel.name);
                    queueContruct.connection = connection;
                    await main.play(interaction.guild, queueContruct.songs[0]);
                } catch (err) {
                    await console.log(err);
                    queue.delete(interaction.guild.id);
                    return await interaction.editReply(err);
                }
                // Remove the first song from the array
                songInfo.shift();
                serverQueue = await queue.get(interaction.guild.id);
                for (let i = 0; i < songInfo.length; i++) {
                    const song = {
                        title: null,
                        url: songInfo[i],
                    };
                    serverQueue.songs.push(song);
                }
                return await interaction.followUp("Added playlist to queue! " + (songInfo.length + 1) + " songs added!");
            } else {
                // add each song to the queue
                for (let i = 0; i < songInfo.length; i++) {
                    const song = {
                        title: null,
                        url: songInfo[i],
                    };
                    serverQueue.songs.push(song);
                }
                return await interaction.editReply("Added playlist to queue! " + (songInfo.length + 1) + " songs added!" + failedSongs.join("\n"));
            }
        } else {
            try {
                songInfo = await ytdl.getInfo(songURL);
                await console.log("Got song info");
            } catch (error) {
                await console.log(error);
                return await interaction.editReply("Song info not found, try checking the URL!");
            }
            const song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
            };
            if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
                serverQueue.songs.length === 0) {
                // Check if connection is destroyed
                const queueContruct = {
                    textChannel: interaction.channel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true,
                    audioPlayer: null,
                    loop: false
                };
                await queue.set(interaction.guild.id, queueContruct);
                queueContruct.songs.push(song);
                try {
                    const channel = await interaction.member.voice.channel;
                    var connection = joinVoiceChannel({
                        channelId: channel.id, // 994907171982692361
                        guildId: channel.guild.id, // 994907168484642928
                        adapterCreator: await channel.guild.voiceAdapterCreator,
                        selfDeaf: false,
                        selfMute: false
                    });
                    queueContruct.connection = connection;
                    await console.log("Joined Voice Channel " + channel.name);
                    await main.play(interaction.guild, queueContruct.songs[0]);
                    return await interaction.editReply("Added song " + song.title + " to queue!");
                } catch (err) {
                    await console.log(err);
                    queue.delete(interaction.guild.id);
                    return await interaction.editReply("Error Occurred: " + err);
                }
            } else {
                serverQueue.songs.push(song);
                return await interaction.editReply(`${song.title} has been added to the queue!`);
            }
        }
    }
}