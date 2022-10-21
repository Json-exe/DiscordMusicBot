const path = require('node:path');

const {
    Client,
    GatewayIntentBits,
    Collection
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
/*const fetch = require('isomorphic-unfetch');
const { getPreview, getTracks } = require('spotify-url-info')(fetch);
const youTube = require("youtube-sr").default;*/

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
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

module.exports.x = x;
var x;

/*
async function probeAndCreateResource(readableStream) {
    const {stream, type} = await demuxProbe(readableStream);
    return createAudioResource(stream, {
        inputType: type,
        inlineVolume: true
    });
}
*/


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

    serverQueue.playing = true;

    try {
        if (song.title === null) {
            // Check if url is a playlist
            if (song.url.includes("list=")) {
                // Get only the video id
                song.url = song.url.split("&list=")[0];
            }
            song.title = (await ytdl.getBasicInfo(song.url)).videoDetails.title;
        }
        const stream = await ytdl(song.url, {
            filter: "audioonly",
            quality: 'highestaudio'
        });
        const player = await createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
        serverQueue.audioPlayer = player;
        // const resource = await probeAndCreateResource(stream);
        const resource = await createAudioResource(stream, {
            inputType: StreamType.Arbitrary
        });
        const connection = serverQueue.connection;
        // await resource.volume.setVolume(serverQueue.volume / 5);
        await connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => {
            console.log("AudioPlayerStatus.Idle -> Playing next song, if one exists");
            serverQueue.songs.shift();
            if (serverQueue.songs.length === 0) {
                serverQueue.playing = false;
                return serverQueue.textChannel.send("No more songs in queue, leaving voice channel in 1 hour...");
            }
            // Wait two seconds before playing next song
            setTimeout(function () {
                play(guild, serverQueue.songs[0]);
            }, 1500);
        }).on('error', error => {
            console.error(error);
        }).on(AudioPlayerStatus.Playing, () => {
            console.log("Playing");
        }).on(AudioPlayerStatus.Paused, () => {
            console.log("Paused");
        }).on(AudioPlayerStatus.AutoPaused, () => {
            console.log("AutoPaused");
            // Resume the player after 1500 ms
            setTimeout(function () {
                player.unpause();
            }, 1500);
        });
        await player.play(resource);
        await serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    } catch (error) {
        await console.log(error);
        await serverQueue.textChannel.send(error.message);
    }
}

client.login(token);