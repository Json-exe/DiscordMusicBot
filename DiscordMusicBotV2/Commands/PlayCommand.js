const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {
    VoiceConnectionStatus, joinVoiceChannel
} = require("@discordjs/voice");
const main = require("../index");
const queue = require("../index.js").queue;
const wait = require('node:timers/promises').setTimeout;
const {playlist_info, search, video_info, spotify, refreshToken, is_expired, so_validate, soundcloud} = require('play-dl');
const {version} = require('../config.json');

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

        let songURL = interaction.options.getString('song');

        // Checking if song is from spotify
        if (songURL.includes("spotify")) {
            await interaction.deferReply();
            await wait(600);
            if (is_expired()) {
                await refreshToken();
            }
            await spotifyLinks(interaction, songURL, serverQueue);
        } else if (songURL.includes("youtube") || songURL.includes("youtu.be")) {
            await interaction.deferReply();
            await wait(600);
            await youtubeLinks(interaction, songURL, serverQueue);
        } else if (songURL.includes("soundcloud")) {
            // return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Soundcloud support is currently removed due to a problem with the play-dl library on linux.").setColor(0x0000ff) ] });
            await interaction.deferReply();
            await wait(600);
            await soundcloudLinks(interaction, songURL, serverQueue);
        } else {
            return await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Invalid URL Type. Bot only supports YT and Spotify Links!").setColor(0x0000ff) ] });
        }
    }
}

async function soundcloudLinks(interaction, songURL, serverQueue) {
    let queueConstruct = {
        textChannel: interaction.channel,
        connection: null,
        songs: [],
        volume: 1,
        playing: true,
        audioPlayer: null,
        loop: false
    };
    let sound;
    try {
        sound = await soundcloud(songURL);
    } catch (err) {
        console.log(err);
        return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Playlist").setColor(0x0000ff).setDescription("Please check the provided URL currently only Soundcloud tracks are supported!")]});
    }
    if (sound.type === "track"){
        let song = {
            title: sound.name,
            url: sound.url,
            duration: sound.durationInSec,
            thumbnail: sound.thumbnail,
            requestedBy: interaction.member
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
        await AddSingleSong(serverQueue, song, interaction, queueConstruct, addedToQueueEmbed);
    } else if (sound.type === "playlist") {
        let songs = [];
        for (let i = 0; i < sound.tracks.length; i++) {
            let song = {
                title: sound.tracks[i].name,
                url: sound.tracks[i].url,
                duration: sound.tracks[i].durationInSec,
                thumbnail: sound.tracks[i].thumbnail,
                requestedBy: interaction.member
            };
            songs.push(song);
        }
        // Create the added to queue embed
        const addedPlaylistEmbed = new EmbedBuilder()
            .setTitle('ADDED PLAYLIST')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${sound.name}\``)
            .setThumbnail(songs[0].thumbnail)
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":musical_note:Songs", value: `${sound.tracksCount}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(sound.durationInSec)}`, inline: true}
            );
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            await InitFirstSong(interaction, songs[0], queueConstruct);
            songs.shift();
            serverQueue = await queue.get(interaction.guild.id);
            for (let i = 0; i < songs.length; i++) {
                serverQueue.songs.push(songs[i]);
            }
            return await interaction.editReply({embeds: [addedPlaylistEmbed]});
        } else {
            for (let i = 0; i < songs.length; i++) {
                serverQueue.songs.push(songs[i]);
            }
            return await interaction.editReply({embeds: [addedPlaylistEmbed]});
        }
    } else {
        return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Playlist").setColor(0x0000ff).setDescription("Please check the provided URL currently only Soundcloud tracks are supported!")]});
    }
}

async function InitFirstSong(interaction, song, queueConstruct) {
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
    } catch (err) {
        await console.log(err);
        queue.delete(interaction.guild.id);
        return await interaction.editReply(err);
    }
}

async function AddSingleSong(serverQueue, song, interaction, queueConstruct, addedToQueueEmbed) {
    if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
        serverQueue.songs.length === 0) {
        // Check if connection is destroyed
        await queue.set(interaction.guild.id, queueConstruct);
        queueConstruct.songs.push(song);
        try {
            const channel = await interaction.member.voice.channel;
            queueConstruct.connection = joinVoiceChannel({
                channelId: channel.id, // 994907171982692361
                guildId: channel.guild.id, // 994907168484642928
                adapterCreator: await channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
            await console.log("Joined Voice Channel " + channel.name);
            await main.play(interaction.guild, queueConstruct.songs[0]);
            return await interaction.editReply({embeds: [addedToQueueEmbed]});
        } catch (err) {
            await console.log(err);
            queue.delete(interaction.guild.id);
            return await interaction.editReply("Error Occurred: " + err);
        }
    } else {
        serverQueue.songs.push(song);
        return await interaction.editReply({embeds: [addedToQueueEmbed]});
    }
}

async function spotifyLinks(interaction, songURL, serverQueue) {
    let firstSong;
    let queueConstruct = {
        textChannel: interaction.channel,
        connection: null,
        songs: [],
        volume: 1,
        playing: true,
        audioPlayer: null,
        loop: false
    };

    // Hotfix for German links
    songURL = songURL.replace("intl-de/", "");

    // Check if the song is a playlist
    if (songURL.includes("playlist")) {
        // Get the playlist
        let playlistInfo;
        let playlist;
        try {
            playlistInfo = await spotify(songURL);
            playlist = await playlistInfo.all_tracks();
        } catch (error) {
            console.error(error);
            await wait(1000);
            return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Playlist").setColor(0x0000ff).setDescription("Please check the provided URL or if the playlist is a public playlist! Error: " + error)]});
        }
        // Get the whole duration of all songs in the playlist
        let playlistDuration = 0;
        for (let i = 0; i < playlist.length; i++) {
            playlistDuration += playlist[i].durationInSec;
        }
        const addedPlaylistEmbed = new EmbedBuilder()
            .setTitle('ADDED PLAYLIST')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${playlistInfo.name}\``)
            .setThumbnail(playlistInfo.thumbnail.url)
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":musical_note:Songs", value: `${playlist.length}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(playlistDuration)}`, inline: true}
            );
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            try {
                firstSong = playlist[0];
                // Get all artists from the song to search on YouTube
                let artists = "";
                for (let i = 0; i < firstSong.artists.length; i++) {
                    artists += firstSong.artists[i].name + " ";
                }
                firstSong = await search(firstSong.name + " " + artists, {limit: 1, unblurNSFWThumbnails: true});
                const song = {
                    title: firstSong[0].title + " - " + artists,
                    url: firstSong[0].url,
                    duration: firstSong[0].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: firstSong[0].thumbnails[0].url
                };
                await InitFirstSong(interaction, song, queueConstruct);
                // Remove the first song from the array
                playlist.shift();
                serverQueue = await queue.get(interaction.guild.id);

                for (let i = 0; i < playlist.length; i++) {
                    let artists = "";
                    for (let j = 0; j < playlist[i].artists.length; j++) {
                        artists += playlist[i]?.artists[j]?.name + ", ";
                    }
                    const song = {
                        title: playlist[i].name,
                        url: playlist[i].url,
                        duration: playlist[i].durationInSec,
                        requestedBy: interaction.member,
                        thumbnail: playlist[i].thumbnail.url
                    };
                    serverQueue.songs.push(song);
                }
                return await interaction.editReply({embeds: [addedPlaylistEmbed]});
            } catch (error) {
                await console.error(error);
                return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Playlist").setColor(0x0000ff).setDescription("Please check the provided URL or if the playlist is a public playlist! " + error)]});
            }
        } else {
            // Loop through the playlist
            for (let i = 0; i < playlist.length; i++) {
                let artists = "";
                for (let j = 0; j < playlist[i].artists.length; j++) {
                    artists += playlist[i].artists[j].name + ", ";
                }
                // Get the url of the song and add it to the queue
                const song = {
                    title: playlist[i].name + " - " + playlist[i].artists[0].name,
                    url: playlist[i].url,
                    duration: playlist[i].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: playlist[i].thumbnail.url
                };
                serverQueue.songs.push(song);
            }
            await wait(1000);
            return await interaction.editReply({embeds: [addedPlaylistEmbed]});
        }
    } else if (songURL.includes("album")) {
        let spotifyAlbum;
        let albumTracks;
        try {
            spotifyAlbum = await spotify(songURL);
            albumTracks = await spotifyAlbum.all_tracks();
        } catch (error) {
            console.error(error);
            await wait(800);
            return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Album").setColor(0x0000ff).setDescription("Please check the provided URL or if the album is a public album! Error: " + error)]});
        }
        // Get the whole duration of all songs in the playlist
        let albumDuration = 0;
        for (let i = 0; i < albumTracks.length; i++) {
            albumDuration += albumTracks[i].durationInSec;
        }
        const addedAlbumEmbed = new EmbedBuilder()
            .setTitle('ADDED ALBUM')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${spotifyAlbum.name}\``)
            .setThumbnail(spotifyAlbum.thumbnail.url)
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":musical_note:Songs", value: `${albumTracks.length}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(albumDuration)}`, inline: true}
            );
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            try {
                firstSong = albumTracks[0];
                // Get all artists from the song to search on YouTube
                let artists = "";
                for (let i = 0; i < firstSong.artists.length; i++) {
                    artists += firstSong.artists[i].name + " ";
                }
                firstSong = await search(firstSong.name + " " + artists, {limit: 1, unblurNSFWThumbnails: true});
                const song = {
                    title: firstSong[0].title + " - " + artists,
                    url: firstSong[0].url,
                    duration: firstSong[0].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: firstSong[0].thumbnails[0].url
                };
                await InitFirstSong(interaction, song, queueConstruct);
                // Remove the first song from the array
                albumTracks.shift();
                serverQueue = await queue.get(interaction.guild.id);

                for (let i = 0; i < albumTracks.length; i++) {
                    let artists = "";
                    for (let j = 0; j < albumTracks[i].artists.length; j++) {
                        artists += albumTracks[i].artists[j].name + ", ";
                    }
                    const song = {
                        title: albumTracks[i].name,
                        url: albumTracks[i].url,
                        duration: albumTracks[i].durationInSec,
                        requestedBy: interaction.member,
                        thumbnail: albumTracks[i].thumbnail.url
                    };
                    serverQueue.songs.push(song);
                }
                return await interaction.editReply({embeds: [addedAlbumEmbed]});
            } catch (error) {
                await console.error(error);
                return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("ERROR").setColor(0x0000ff).setDescription("An error occurred while trying to add the album to the queue! Error: " + error)]});
            }
        } else {
            // Loop through the playlist
            for (let i = 0; i < albumTracks.length; i++) {
                let artists = "";
                for (let j = 0; j < albumTracks[i].artists.length; j++) {
                    artists += albumTracks[i].artists[j].name + ", ";
                }
                // Get the url of the song and add it to the queue
                const song = {
                    title: albumTracks[i].name + " - " + albumTracks[i].artists[0].name,
                    url: albumTracks[i].url,
                    duration: albumTracks[i].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: albumTracks[i].thumbnail.url
                };
                serverQueue.songs.push(song);
            }
            await wait(1000);
            return await interaction.editReply({embeds: [addedAlbumEmbed]});
        }
    } else {
        let spotifySong;
        try {
            spotifySong = await spotify(songURL);
        }
        catch (error) {
            console.error(error);
            await wait(500)
            return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please check URL/Playlist").setColor(0x0000ff).setDescription("Please check the provided URL or if the song is public! Song info could not be loaded! Error: " + error)]});
        }
        // Get all artists from the song to search on YouTube
        let artists = "";
        for (let i = 0; i < spotifySong.artists.length; i++) {
            artists += spotifySong.artists[i].name + " ";
        }
        const video = await search(spotifySong.name + " " + artists, {limit: 1, unblurNSFWThumbnails: true});
        const song = {
            title: video[0].title,
            url: video[0].url,
            duration: video[0].durationInSec,
            requestedBy: interaction.member,
            thumbnail: video[0].thumbnails[0].url
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
        await AddSingleSong(serverQueue, song, interaction, queueConstruct, addedToQueueEmbed);
    }
}

async function youtubeLinks(interaction, songURL, serverQueue) {
    // Get all songs from the playlist if the URL is a playlist
    let songInfo;
    let queueConstruct = {
        textChannel: interaction.channel,
        connection: null,
        songs: [],
        volume: 1,
        playing: true,
        audioPlayer: null,
        audioResource: null,
        loop: false
    };
    if (songURL.includes("list=")) {
        // Get the playlist ID from the URL
        // Check if link is from a video of a playlist
        if (songURL.includes("watch" || "index=")) {
            await wait(1000);
            return await interaction.editReply({embeds: [new EmbedBuilder().setTitle("Please provide a valid playlist link!").setColor(0x0000ff)]});
        }
        //const playlistID = songURL.split("list=")[1];
        let playlist;
        let tracks;
        try {
            playlist = await playlist_info(songURL, {incomplete: true});
            tracks = await playlist.all_videos();
        } catch (error) {
            await console.log(error);
            await wait(2000);
            return await interaction.editReply("Failed to load Playlist. Please check the URL and try again! Error: " + error.message);
        }
        // Get the fetched songs from the playlist
        songInfo = tracks;
        // Get the whole duration of all songs in the playlist
        let playlistDuration = 0;
        for (let i = 0; i < tracks.length; i++) {
            playlistDuration += tracks[i].durationInSec;
        }
        const addedPlaylistEmbed = new EmbedBuilder()
            .setTitle('ADDED PLAYLIST')
            .setColor(0x0000ff)
            .setDescription(`:white_check_mark: \`${playlist.title}\``)
            .setThumbnail(playlist.thumbnail.url)
            .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
            .addFields(
                {name: ":microphone:Added by", value: `${interaction.member}`, inline: true},
                {name: ":musical_note:Songs", value: `${playlist.videoCount}`, inline: true},
                {name: ":alarm_clock:Duration", value: `❯ ${await main.convertSecondsToTime(playlistDuration)}`, inline: true}
            );
        serverQueue = await queue.get(interaction.guild.id);
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected ||
            serverQueue.songs.length === 0) {
            let firstSong = songInfo[0];
            const song = {
                title: firstSong.title,
                url: firstSong.url,
                duration: firstSong.durationInSec,
                requestedBy: interaction.member,
                thumbnail: firstSong.thumbnails[0].url
            };
            await InitFirstSong(interaction, song, queueConstruct);
            // Remove the first song from the array
            songInfo.shift();
            serverQueue = await queue.get(interaction.guild.id);
            for (let i = 0; i < songInfo.length; i++) {
                const song = {
                    title: songInfo[i].title,
                    url: songInfo[i].url,
                    duration: songInfo[i].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: songInfo[i].thumbnails[0].url
                };
                serverQueue.songs.push(song);
            }
            return await interaction.editReply({embeds: [addedPlaylistEmbed]});
        } else {
            // add each song to the queue
            for (let i = 0; i < songInfo.length; i++) {
                const song = {
                    title: songInfo[i].title,
                    url: songInfo[i].url,
                    duration: songInfo[i].durationInSec,
                    requestedBy: interaction.member,
                    thumbnail: songInfo[i].thumbnails[0].url
                };
                serverQueue.songs.push(song);
            }
            return await interaction.editReply({embeds: [addedPlaylistEmbed]});
        }
    } else {
        try {
            songInfo = await video_info(songURL);
        } catch (error) {
            await console.log(error);
            await wait(1000);
            return await interaction.editReply("Song info not found, try checking the URL! Or try again. Error: " + error.message);
        }
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
        await AddSingleSong(serverQueue, song, interaction, queueConstruct, addedToQueueEmbed);
    }
}