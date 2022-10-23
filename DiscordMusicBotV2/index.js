const path = require('node:path');

const {
    Client,
    GatewayIntentBits,
    Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const {token, version} = require('./config.json');
const fs = require('node:fs');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    AudioPlayerStatus,
    StreamType, VoiceConnectionStatus, demuxProbe
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const {generateDependencyReport} = require('@discordjs/voice');
const {default: youTube} = require("youtube-sr");
const fetch = require("isomorphic-unfetch");
const { getPreview } = require('spotify-url-info')(fetch);

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});

const args = process.argv.slice(2);

console.log(generateDependencyReport());

const queue = new Map();
// Export the queue, so it can be used in other files
module.exports.queue = queue;


client.commands = new Collection();
const commandsPath = path.join(__dirname, 'Commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}


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

client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === "feedback-modal") {
        await interaction.reply({content: "Thank you for your feedback!"});
        const feedback = interaction.fields.getTextInputValue("feedback-text");
        // Save the feedback and the user to the feedback.json file
        const file = require('./feedback.json');
        await file.feedbackFile.push({user: interaction.user.username, feedback: feedback});
        await fs.writeFileSync('./feedback.json', JSON.stringify(file));
        await console.log("Saved feedback to feedback.json");
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const serverQueue = await queue.get(interaction.guild.id);

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, serverQueue);
    } catch (error) {
        console.error(error);
        if (interaction.replied) {
            return await interaction.followUp({content: "There was an error while executing the command!"});
        }
        return interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const serverQueue = await queue.get(interaction.guild.id);
    if (interaction.customId === "pause"){
        const pauseUnpause = require('./Commands/PauseUnpauseCommand');
        await pauseUnpause.execute(interaction, serverQueue);
    } else if (interaction.customId === "stop") {
        const stop = require('./Commands/StopCommand');
        await stop.execute(interaction, serverQueue);
    } else if (interaction.customId === "skip") {
        const skip = require('./Commands/SkipCommand');
        await skip.execute(interaction, serverQueue);
    } else if (interaction.customId === "loop") {
        const loop = require('./Commands/LoopSongCommand');
        await loop.execute(interaction, serverQueue);
    }
});

let x;
module.exports.x = x;

async function probeAndCreateResource(readableStream) {
    const {stream, type} = await demuxProbe(readableStream);
    return createAudioResource(stream, {
        inputType: type,
    });
}

module.exports.play = play;
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

    // Check if the bot has been disconnected
    if (serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected && guild.me.voice === null || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed && guild.me.voice === null) {
        // Destroy the queue.
        await console.log("Bot has been disconnected, destroying queue...");
        queue.delete(guild.id);
        return;
    }

    // Check if the bot has been moved to a different voice channel
    if (serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed || serverQueue.connection.state.status === VoiceConnectionStatus.Disconnected) {
        // Set the new Voice connection
        await console.log("Bot has been moved to a different voice channel, setting new voice connection...");
        const channel = await guild.me.voice.channel;
        serverQueue.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: await channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });
    }

    // get the channel from the channel id
    const channel = await client.channels.fetch(serverQueue.connection.joinConfig.channelId);
    // Get the users in the channel
    const users = channel.members.filter(member => !member.user.bot);
    // Check if the bot is the only one in the channel
    if (users.size === 0) {
        // Destroy the queue.
        await console.log("Bot is the only one in the channel, destroying queue...");
        queue.delete(guild.id);
        return;
    }

    serverQueue.playing = true;

    try {
        if (song.url.includes("youtube")) {
            if (song.title === null || song.duration === null || song.thumbnail === null) {
                // Check if url is a playlist
                if (song.url.includes("list=")) {
                    // Get only the video id
                    song.url = song.url.split("&list=")[0];
                }
                const info = await ytdl.getInfo(song.url);
                song.title = info.videoDetails.title;
                song.duration = info.videoDetails.lengthSeconds;
                song.thumbnail = info.videoDetails.thumbnails[0].url;
            }
        } else {
            const spotifySong = await getPreview(song.url);
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
            song.url = video.url;
        }

        // Create Now Playing Embed
        const nowPlayingEmbed = new EmbedBuilder()
            .setTitle('NOW PLAYING')
            .setURL(song.url)
            .setColor(0x0000ff)
            .setDescription(`🖸 \`${song.title}\``)
            .setThumbnail(song.thumbnail)
            .addFields(
                { name: ':microphone: Requested By', value: `${song.requestedBy.member}`, inline: true },
                { name: '⏰ Duration', value: `${await convertSecondsToTime(song.duration)}`, inline: true },
            );

        const nowPlayingComponents = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('pause')
                    .setLabel('Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('loop')
                    .setLabel('Loop')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('Skip')
                    .setStyle(ButtonStyle.Success),
            );

        const stream = await ytdl(song.url, {
            filter: "audioonly",
            quality: 'lowestaudio',
            highWaterMark: 1 << 62,
            dlChunkSize: 0,
            bitrate: 96,
            liveBuffer: 1 << 62,
            fmt: 'mp3',
        });
        const player = await createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
        serverQueue.audioPlayer = player;
        const resource = await probeAndCreateResource(stream);
        // const resource = await createAudioResource(stream, {
        //     inputType: StreamType.Arbitrary
        // });
        const connection = serverQueue.connection;
        // await resource.volume.setVolume(serverQueue.volume / 5);
        await connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, async () => {
            if (!serverQueue.loop)
                serverQueue.songs.shift();
            if (serverQueue.songs.length === 0) {
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
                return await serverQueue.textChannel.send({embeds: [new EmbedBuilder().setTitle("No more songs in queue! Leaving in 1 Hour.").setColor(0x0000ff)]});
            }
            // Wait a bit before playing next song
            setTimeout(function () {
                play(guild, serverQueue.songs[0]);
            }, 1500);
        }).on('error', error => {
            console.error(error);
        }).on(AudioPlayerStatus.AutoPaused, () => {
            // Resume the player after 1500 ms
            setTimeout(function () {
                player.unpause();
            }, 1500);
        });
        await player.play(resource);
        await serverQueue.textChannel.send({ embeds: [nowPlayingEmbed], components: [nowPlayingComponents] });
    } catch (error) {
        await console.log(error);
        await serverQueue.textChannel.send(error.message);
    }
}

module.exports.convertSecondsToTime = convertSecondsToTime;
async function convertSecondsToTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time - (hours * 3600)) / 60);
    const seconds = time - (hours * 3600) - (minutes * 60);
    let result = (hours < 10 ? "0" + hours : hours);
    result += ":" + (minutes < 10 ? "0" + minutes : minutes);
    result += ":" + (seconds < 10 ? "0" + seconds : seconds);
    return result;
}

client.login(token);