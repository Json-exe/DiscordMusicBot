const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {VoiceConnectionStatus, joinVoiceChannel} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const main = require("../index");
const queue = require("../index.js").queue;
const wait = require('node:timers/promises').setTimeout;
const fetch = require('isomorphic-unfetch');
const {play} = require("../index");
const { getPreview, getTracks, getData } = require('spotify-url-info')(fetch);
const youTube = require("youtube-sr").default;

module.exports = {
    data: new SlashCommandBuilder()
            .setName('play')
            .setDescription('Plays a song in the voice channel of the user who sent the command.')
            .addStringOption(option => option.setName('song').setDescription('The song to play.').setRequired(true)),
    async execute(interaction, serverQueue) {
        const voiceChannel = await interaction.member.voice.channel;
        if (!voiceChannel)
            return await interaction.editReply(
                "You need to be in a voice channel to play music!"
            );

        if (!voiceChannel.joinable) return await interaction.editReply('I cannot join your voice channel! Check the permissions please!');

        const permissions = await voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return await interaction.editReply(
                "I need the permissions to join and speak in your voice channel!"
            );
        }

        let songURL = interaction.options.getString('song');

        interaction.deferReply();

        // Checking if song is from spotify
        if (songURL.includes("spotify")) {
            await spotifyLinks(interaction, songURL, serverQueue);
        } else if (songURL.includes("youtube")) {
            await youtubeLinks(interaction, songURL, serverQueue);
        } else {
            await wait(1000);
            return await interaction.editReply({ embeds: [ new EmbedBuilder().setTitle("Invalid URL Type").setColor(0x0000ff) ] });
        }
    }
}

async function spotifyLinks(interaction, songURL, serverQueue) {
    let songInfo;
    const failedSongs = [];
    // Check if the song is a playlist
    if (songURL.includes("playlist")) {
        // Get the playlist
        const playlist = await getTracks(songURL);
        const addedPlaylistEmbed = new EmbedBuilder()
            .setTitle('ADDED PLAYLIST')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`Adding your playlist\``)
            .addFields( { name: "ㅤ", value: `Added by ${interaction.member} | Songs: ${playlist.length}`} );
        songInfo = playlist;
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            try {
                var firstSong = playlist[0];
                // Get all artists from the song to search on YouTube
                let artists = "";
                if (!firstSong.artists) {
                    artists = firstSong.artist;
                } else {
                    for (let i = 0; i < firstSong.artists.length; i++) {
                        artists += firstSong.artists[i].name + " ";
                    }
                }
                firstSong = await youTube.searchOne(firstSong.name + " " + artists);
                const song = {
                    title: firstSong.title,
                    url: firstSong.url,
                    duration: Math.round(firstSong.duration / 1000),
                    requestedBy: interaction,
                    thumbnail: firstSong.thumbnail.url
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
                        selfDeaf: true,
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
                        title: songInfo[i].name,
                        url: songInfo[i].external_urls.spotify,
                        duration: Math.round(songInfo[i].duration_ms / 1000),
                        requestedBy: interaction,
                        thumbnail: songInfo[i].album.images[0].url
                    };
                    serverQueue.songs.push(song);
                }
                return await interaction.editReply({ embeds: [ addedPlaylistEmbed ] });
            } catch (error) {
                await console.error(error);
                failedSongs.push("Failed adding song: " + firstSong);
            }
        } else {
            // Loop through the playlist
            for (let i = 0; i < playlist.length; i++) {
                // Get the url of the song and add it to the queue
                const song = {
                    title: playlist[i].name,
                    url: playlist[i].external_urls.spotify,
                    duration: Math.round(playlist[i].duration_ms / 1000),
                    requestedBy: interaction,
                    thumbnail: playlist[i].album.images[0].url
                };
                serverQueue.songs.push(song);
            }
            await wait(1000);
            return await interaction.editReply({ embeds: [ addedPlaylistEmbed ] });
        }
    } else {
        const spotifySong = await getPreview(songURL);
        // Get all artists from the song to search on YouTube
        let artists = "";
        if (!spotifySong.artists) {
            artists = spotifySong.artist;
        } else {
            for (let i = 0; i < spotifySong.artists.length; i++) {
                artists += spotifySong.artists[i].name + " ";
            }
        }
        const video = await youTube.searchOne(spotifySong.title + " " + artists);
        songURL = video.url;
        await youtubeLinks(interaction, songURL, serverQueue)
    }
}

async function youtubeLinks(interaction, songURL, serverQueue) {
    // Get all songs from the playlist if the URL is a playlist
    let songInfo;
    const failedSongs = [];
    if (songURL.includes("list=")) {
        // Get the playlist ID from the URL
        // Check if link is from a video of a playlist
        if (songURL.includes("watch" || "index=")) {
            await wait(1000);
            return await interaction.editReply({ embeds: [ new EmbedBuilder().setTitle("Please provide a valid playlist link!").setColor(0x0000ff) ] });
        }
        const playlistID = songURL.split("list=")[1];
        var playlist;
        try {
            playlist = await ytpl(playlistID, { limit: Infinity });
        } catch (error) {
            await console.log(error);
            await wait(2000);
            return await interaction.editReply("Failed to load Playlist. Please check the URL and try again!");
        }
        songInfo = playlist.items.map(item => item.url);
        const addedPlaylistEmbed = new EmbedBuilder()
            .setTitle('ADDED PLAYLIST')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`Here we go\``)
            .addFields( { name: "ㅤ", value: `Added by ${interaction.member} | Songs: ${songInfo.length}`} );
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
                duration: firstSong.videoDetails.lengthSeconds,
                requestedBy: interaction,
                thumbnail: firstSong.videoDetails.thumbnails[0].url
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
                    selfDeaf: true,
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
                    duration: null,
                    requestedBy: interaction,
                    thumbnail: null
                };
                serverQueue.songs.push(song);
            }
            return await interaction.editReply({ embeds: [ addedPlaylistEmbed ] });
        } else {
            // add each song to the queue
            for (let i = 0; i < songInfo.length; i++) {
                const song = {
                    title: null,
                    url: songInfo[i],
                    duration: null,
                    requestedBy: interaction.member,
                    thumbnail: null
                };
                serverQueue.songs.push(song);
            }
            return await interaction.editReply({ embeds: [ addedPlaylistEmbed ] });
        }
    } else {
        try {
            songInfo = await ytdl.getInfo(songURL);
            await console.log("Got song info");
        } catch (error) {
            await console.log(error);
            await wait(2000);
            return await interaction.editReply("Song info not found, try checking the URL!");
        }
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: songInfo.videoDetails.lengthSeconds,
            requestedBy: interaction,
            thumbnail: songInfo.videoDetails.thumbnails[0].url
        };
        // Create the added to queue embed
        const addedToQueueEmbed = new EmbedBuilder()
            .setTitle('ADDED TO QUEUE')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${song.title}\``)
            .setThumbnail(song.thumbnail)
            .addFields( { name: "ㅤ", value: `Added by ${interaction.member} | Duration: \`❯ ${await main.convertSecondsToTime(song.duration)}\``} );
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
                    selfDeaf: true,
                    selfMute: false
                });
                queueContruct.connection = connection;
                await console.log("Joined Voice Channel " + channel.name);
                await main.play(interaction.guild, queueContruct.songs[0]);
                return await interaction.editReply({ embeds: [addedToQueueEmbed] });
                //return await interaction.editReply("Added song " + song.title + " to queue!");
            } catch (err) {
                await console.log(err);
                queue.delete(interaction.guild.id);
                return await interaction.editReply("Error Occurred: " + err);
            }
        } else {
            serverQueue.songs.push(song);
            return await interaction.editReply({ embeds: [addedToQueueEmbed] });
        }
    }
}