const {Client, GatewayIntentBits} = require('discord.js');
const {token, changelog, version} = require('./config.json');
const {join} = require('path');
const fs = require('node:fs');
const {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    AudioPlayerStatus,
    StreamType
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytpl = require('ytpl');
const {generateDependencyReport} = require('@discordjs/voice');

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});

const args = process.argv.slice(2);

client.once('ready', () => {
    console.log('Ready!');
    if (args[0] === "debug") {
        client.user.setPresence({
            activities: [{name: "Under Maintenance. Do not use!"}],
            status: 'dnd'
    });
    } else {
        client.user.setPresence({
            activities: [{name: `Chilling in Alpha! (${version})`}],
            status: 'online'
        });
    }
});

client.once('reconnecting', () => {
    console.log('Reconnecting!');
});

client.once('disconnect', () => {
    console.log('Disconnect!');
});

console.log(generateDependencyReport());

const queue = new Map();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const {commandName} = interaction;

    const serverQueue = queue.get(interaction.guild.id);

    if (commandName === 'join-voice') {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply('You need to join a voice channel first!');
        if (!channel.joinable) return interaction.reply('I cannot join your voice channel! Check the permissions please!');
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        console.log("Joined Voice Channel " + channel.name);
        await interaction.reply('Joined your voice channel!');
    } else if (commandName === 'leave-voice') {
        const connection = getVoiceConnection(interaction.guildId);
        if (!interaction) return interaction.reply('I am not in a voice channel!');
        connection.destroy();
        await interaction.reply('Left your voice channel!');
    } else if (commandName === 'play') {
        await execute(interaction, serverQueue);
        return;
    } else if (commandName === 'skip') {
        await skip(interaction, serverQueue);
        return;
    } else if (commandName === 'stop') {
        await stop(interaction, serverQueue);
        return;
    } else if (commandName === 'play-server-file') {
        await playServerFile(interaction);
        return;
    } else if (commandName === 'available-server-music') {
        await getAllFiles(interaction);
        return;
    } else if (commandName === 'changelog') {
        await interaction.reply(changelog, {ephemeral: true});
        return;
    } else if (commandName === 'pause-unpause') {
        await pauseUnpause(interaction, serverQueue);
        return;
    } else {
        await interaction.reply('Unknown command');
    }
})

async function getAllFiles(interaction) {
    const path = join(__dirname, '\\music');
    const files = fs.readdirSync(path, (err, files) => {
        files.forEach(file => {
            console.log(file);
        });
    }).filter(file => file.endsWith('.mp3'));
    return await interaction.reply("Playable Music: " + files, {ephemeral: true});
}

async function playServerFile(interaction) {
    // Get the filename from the interaction
    const filename = interaction.options.getString('filename');
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You need to join a voice channel first!');
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
    });
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        },
    });
    const path = join(__dirname, `\\music\\${filename}.mp3`);
    const resource = createAudioResource(path, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
    });
    player.play(resource);
    connection.subscribe(player);
    await interaction.reply('Playing audio file!', {ephemeral: true});
}

async function execute(interaction, serverQueue) {
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

    const songURL = interaction.options.getString('song');
    let songInfo;

    // Get all songs from the playlist if the URL is a playlist
    if (songURL.includes("list=")) {
        // Get the playlist ID from the URL
        const playlistID = songURL.split("list=")[1];
        const playlist = await ytpl(playlistID);
        songInfo = playlist.items.map(item => item.url);
        serverQueue = await queue.get(interaction.guild.id);
        if (!serverQueue) {
            try {
                songInfo[0] = await ytdl.getInfo(songInfo[0]);
            } catch (error) {
                await console.error(error);
                await interaction.followUp("Failed adding song: " + songInfo[0]);
            }
            const song = {
                title: songInfo[0].videoDetails.title,
                url: songInfo[0].videoDetails.video_url,
            };
            await interaction.reply(":thumbsup:");
            const queueContruct = {
                textChannel: interaction.channel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
                audioPlayer: null
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
                queueContruct.connection = connection;
                await play(interaction.guild, queueContruct.songs[0]);
            } catch (err) {
                await console.log(err);
                queue.delete(interaction.guild.id);
                return await interaction.followUp(err);
            }
            serverQueue = await queue.get(interaction.guild.id);
            serverQueue.songs = serverQueue.songs.concat(songInfo);
            return await interaction.followUp("Added playlist to queue! " + songInfo.length + " songs added!");
            /*for (let i = 1; i < songInfo.length; i++) {
                const song = {
                    title: null,
                    url: songInfo[i],
                };
                serverQueue.songs.push(song);
            }*/
        } else {
            // add each song to the queue
            serverQueue.songs = serverQueue.songs.concat(songInfo);
            return await interaction.reply("Added playlist to queue! " + songInfo.length + " songs added!");
            /*for (let i = 0; i < songInfo.length; i++) {
                const song = {
                    title: null,
                    url: songInfo[i],
                };
                serverQueue.songs.push(song);
            }*/
        }
    } else {
        try {
            songInfo = await ytdl.getInfo(songURL);
            await console.log("Got song info");
        } catch (error) {
            await console.log(error);
            return await interaction.reply("Song info not found, try checking the URL!");
        }
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        if (!serverQueue) {
            await interaction.reply(":thumbsup:")
            const queueContruct = {
                textChannel: interaction.channel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
                audioPlayer: null
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
                await play(interaction.guild, queueContruct.songs[0]);
                return await interaction.followUp("Added song " + song.title + " to queue!");
            } catch (err) {
                await console.log(err);
                queue.delete(interaction.guild.id);
                return await interaction.followUp("Error Occurred: " + err);
            }
        } else {
            serverQueue.songs.push(song);
            return await interaction.reply(`${song.title} has been added to the queue!`);
        }
    }
}

var x;

async function pauseUnpause(interaction, serverQueue) {
    if (!serverQueue || serverQueue.songs.length === 0) return await interaction.reply("There is no song playing!");
    // Return if executing user is not in the same voice channel as the bot
    if (interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return await interaction.reply("You are not in the same voice channel as the bot!");
    if (serverQueue.playing) {
        serverQueue.playing = false;
        serverQueue.audioPlayer.pause();
        await interaction.reply("Song paused!");
    } else {
        serverQueue.playing = true;
        serverQueue.audioPlayer.unpause();
        await interaction.reply("Song unpaused!");
    }
}

async function play(guild, song) {
    if (x) {
        clearInterval(x);
    }
    const serverQueue = await queue.get(guild.id);
    if (!song) {
        serverQueue.playing = false;
        var d = await new Date(Date.now());
        d.setHours(d.getHours() + 1);
        x = setInterval(function () {
            var now = new Date().getTime();
            var t = d - now;
            if (t < 0) {
                clearInterval(x);
                serverQueue.connection.destroy();
                queue.delete(guild.id);
            }
        }, 1000);
        return;
    }

    serverQueue.playing = true;

    try {
        if (!song.title) {
            song.title = (await ytdl.getBasicInfo(song.url)).videoDetails.title;
        }
        const stream = await ytdl(song.url, {
            filter: "audioonly",
            highWaterMark: 1 << 25,
            quality: 'highestaudio'
        });
        const player = await createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
        serverQueue.audioPlayer = player;
        const resource = await createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });
        const connection = serverQueue.connection;
        await resource.volume.setVolume(serverQueue.volume / 5);
        await connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => {
            console.log("AudioPlayerStatus.Idle");
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        }).on('error', error => {
            console.error(error);
        }).on(AudioPlayerStatus.Playing, () => {
            console.log("Playing");
        }).on(AudioPlayerStatus.Paused, () => {
            console.log("Paused");
        }).on(AudioPlayerStatus.AutoPaused, () => {
            console.log("AutoPaused");
            // Resume the player
            player.unpause();
        });
        await player.play(resource);
        await serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    } catch (error) {
        await console.log(error);
        await serverQueue.textChannel.send(error.message);
    }
}

async function skip(interaction, serverQueue) {
    if (!interaction.member.voice.channel)
        return await interaction.reply(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return await interaction.reply("There is no song that I could skip! Add some to the queue!");

    // Skip the given number of songs
    const skipCount = interaction.options.getInteger('amount');
    if (skipCount > serverQueue.songs.length) {
        return await interaction.reply(`There are only ${serverQueue.songs.length} songs in the queue!`);
    }
    serverQueue.songs = serverQueue.songs.slice(skipCount);
    await play(interaction.guild, serverQueue.songs[0]);
    await interaction.reply(`Skipped ${skipCount} songs!`);
}

async function stop(interaction, serverQueue) {
    if (!interaction.member.voice.channel)
        return await interaction.reply(
            "You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue.connection) return;

    if (!x) {
        clearInterval(x);
    }

    serverQueue.songs = [];
    serverQueue.connection.destroy();
    serverQueue.audioPlayer = null;
    await interaction.reply("Stopped the music!");
}

client.login(token);