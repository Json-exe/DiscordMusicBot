const path = require('node:path');
const {
    Client,
    GatewayIntentBits,
    Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType
} = require('discord.js');
const {token, version} = require('./config.json');
const fs = require('node:fs');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    AudioPlayerStatus,
    sourceType, VoiceConnectionStatus, demuxProbe, AudioPlayer
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const {generateDependencyReport} = require('@discordjs/voice');
const {spotify, search, is_expired, refreshToken, stream, soundcloud, setToken, getFreeClientID} = require("play-dl");

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
    getFreeClientID().then((clientID) => setToken({
        soundcloud : {
            client_id : clientID
        }
    }))
    if (args[0] === "debug") {
        client.user.setPresence({
            activities: [{name: "Under Maintenance. Do not use!", type: ActivityType.Watching}],
            status: 'dnd'
        });
    } else {
        client.user.setPresence({
            activities: [{name: `/play`, type: ActivityType.Listening}],
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
    switch (interaction.customId) {
        case "pause":
            const pauseUnpause = require('./Commands/PauseUnpauseCommand');
            await pauseUnpause.execute(interaction, serverQueue);
            break;
        case "stop":
            const stop = require('./Commands/StopCommand');
            await stop.execute(interaction, serverQueue);
            break;
        case "skip":
            const skip = require('./Commands/SkipCommand');
            await skip.execute(interaction, serverQueue);
            break;
        case "loop":
            const loop = require('./Commands/LoopSongCommand');
            await loop.execute(interaction, serverQueue);
            break;
        case "volumeup":
            if (serverQueue.volume === 1) return interaction.reply({content: "The volume is already at 100%", ephemeral: true});
            serverQueue.volume += 0.1;
            serverQueue.audioResource.volume.setVolume(serverQueue.volume);
            await interaction.reply({content: `Volume set to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true});
            break;
        case "volumedown":
            if (serverQueue.volume === 0) return interaction.reply({content: "The volume is already at 0%", ephemeral: true});
            serverQueue.volume -= 0.1;
            serverQueue.audioResource.volume.setVolume(serverQueue.volume);
            await interaction.reply({content: `Volume set to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true});
            break;
    }
});

let x;
module.exports.x = x;

async function probeAndCreateResource(readablesource){
    const {source, type} = await demuxProbe(readablesource);
    return createAudioResource(source, {
        inputType: type,
        inlineVolume: true
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
        let d = await new Date(Date.now());
        d.setHours(d.getHours() + 1);
        x = setInterval(function () {
            let now = new Date().getTime();
            let t = d - now;
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
        if (song.url.includes("youtube") && !song.url.includes(".mp3" || ".wav" || ".ogg") || song.url.includes("spotify") && !song.url.includes(".mp3" || ".wav" || ".ogg")
            || song.url.includes("soundcloud") && !song.url.includes(".mp3" || ".wav" || ".ogg")) {
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
            } else if (song.url.includes("soundcloud")) {
                if (song.title === null || song.duration === null || song.thumbnail === null) {
                    const info = await soundcloud(song.url);
                    song.title = info.name;
                    song.duration = info.durationInSec;
                    song.thumbnail = info.thumbnail;
                }
            } else {
                try {
                    if (is_expired()) {
                        await refreshToken();
                    }
                    const spotifySong = await spotify(song.url);
                    // Get all artists from the song to search on YouTube
                    console.log(spotifySong);
                    let artists = "";
                    for (let i = 0; i < spotifySong.artists.length; i++) {
                        artists += spotifySong.artists[i].name + " ";
                    }
                    const video = await search(spotifySong.name + " " + artists, {
                        limit: 1,
                        unblurNSFWThumbnails: true,
                        source: {youtube: "video"}
                    });
                    if (video[0] === undefined) {
                        return await serverQueue.textChannel.send({content: `No results found on YouTube for ${song.url} song!`});
                    }
                    song.url = video[0].url;
                } catch (e) {
                    console.error(e);
                    const playFailed = new EmbedBuilder()
                        .setTitle('SONG PLAY FAILED')
                        .setURL(song.url)
                        .setColor(0x0000ff)
                        .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
                        .setDescription(`🖸 \`${song.title}\` Song play failed! Please try again later. Error: ${e}`)
                        .setThumbnail(song.thumbnail)
                    serverQueue.songs.shift();
                    await play(guild, serverQueue.songs[0]);
                    return await serverQueue.textChannel.send({embeds: [playFailed]});
                }
            }

            // Create Now Playing Embed
            const nowPlayingEmbed = new EmbedBuilder()
                .setTitle('NOW PLAYING')
                .setURL(song.url)
                .setColor(0x0000ff)
                .setDescription(`🖸 \`${song.title}\``)
                .setThumbnail(song.thumbnail)
                .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
                .addFields(
                    {name: ':microphone: Requested By', value: `${song.requestedBy}`, inline: true},
                    {name: '⏰ Duration', value: `${await convertSecondsToTime(song.duration)}`, inline: true},
                );

            const AudioControlComponents = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('volumeup')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('volumedown')
                        .setEmoji('🔉')
                        .setStyle(ButtonStyle.Secondary),
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

            /*const source = await ytdl(song.url, {
                filter: "audioonly",
                quality: 'highestaudio',
                highWaterMark: 1 << 16,
                dlChunkSize: 1 << 12,
                bitrate: 96,
                liveBuffer: 1 << 30,
                fmt: 'mp3'
            });*/

            const source = await stream(song.url, { quality: 2 })
            const player = await createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
            serverQueue.audioPlayer = player;
            const resource = createAudioResource(source.stream, { inputType: source.type, inlineVolume: true });
            // TODO: Remove this if inline volume is disabled!
            resource.volume.setVolume(serverQueue.volume)
            serverQueue.audioResource = resource;
            const connection = serverQueue.connection;
            connection.removeAllListeners();
            await connection.subscribe(player);
            player.on(AudioPlayerStatus.Idle, async () => {
                if (!serverQueue.loop)
                    serverQueue.songs.shift();
                if (serverQueue.songs.length === 0) {
                    serverQueue.playing = false;
                    let d = await new Date(Date.now());
                    d.setHours(d.getHours() + 1);
                    x = setInterval(function () {
                        let now = new Date().getTime();
                        let t = d - now;
                        if (t < 0) {
                            clearInterval(x);
                            if (serverQueue?.connection?.state?.status !== VoiceConnectionStatus.Destroyed) {
                                serverQueue.connection.destroy();
                            }
                            queue.delete(guild.id);
                        }
                    }, 1000);
                    return await serverQueue.textChannel.send({embeds: [new EmbedBuilder().setTitle("No more songs in queue! Leaving in 1 Hour.").setColor(0x0000ff)]});
                }
                setTimeout(function () {
                    play(guild, serverQueue.songs[0]);
                }, 1500);
            }).on('error', error => {
                console.error(error);
            }).on(AudioPlayerStatus.AutoPaused, () => {
                setTimeout(function () {
                    console.log("Unpausing");
                    player.unpause();
                }, 1000);
            });
            await player.play(resource);
            await serverQueue.textChannel.send({embeds: [nowPlayingEmbed], components: [nowPlayingComponents, AudioControlComponents]});
        } else {
            // Create Now Playing Embed
            const nowPlayingEmbed = new EmbedBuilder()
                .setTitle('NOW PLAYING')
                .setURL(song.url)
                .setColor(0x0000ff)
                .setDescription(`🖸 \`${song.title}\``)
                .setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"})
                .setThumbnail(song.thumbnail)
                .addFields(
                    {name: ':microphone: Requested By', value: `${song.requestedBy}`, inline: true}
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
            let resource;
            if (song.url.endsWith(".mp3")) {
                resource = createAudioResource(song.url, {
                    inputType: sourceType.Arbitrary,
                    inlineVolume: true
                });
            } else if (song.url.endsWith(".ogg")) {
                resource = createAudioResource(song.url, {
                    inputType: sourceType.OggOpus,
                    inlineVolume: true
                });
            } else if (song.url.endsWith(".webm")) {
                resource = createAudioResource(song.url, {
                    inputType: sourceType.WebmOpus,
                    inlineVolume: true
                });
            } else {
                resource = await createAudioResource(song.url, {
                    inputType: sourceType.Arbitrary,
                    inlineVolume: true,
                });
            }
            const player = await createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
            serverQueue.audioPlayer = player;
            // TODO: Remove this if inline volume is disabled!
            resource.volume.setVolume(serverQueue.volume)
            serverQueue.audioResource = resource;
            const connection = serverQueue.connection;
            await connection.subscribe(player);
            player.on(AudioPlayerStatus.Idle, async () => {
                if (!serverQueue.loop)
                    serverQueue.songs.shift();
                if (serverQueue.songs.length === 0) {
                    serverQueue.playing = false;
                    let d = await new Date(Date.now());
                    d.setHours(d.getHours() + 1);
                    x = setInterval(function () {
                        let now = new Date().getTime();
                        let t = d - now;
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
            }).on('autopaused', () => {
                setTimeout(function () {
                    var unpaused = false;
                    while (!unpaused) {
                        console.log("Unpausing");
                        unpaused = player.unpause();
                    }
                }, 1500);
            });
            await player.play(resource);
            await serverQueue.textChannel.send({embeds: [nowPlayingEmbed], components: [nowPlayingComponents, AudioControlComponents]});
        }
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

client.login(token).then(r => console.log("Logged in!"));