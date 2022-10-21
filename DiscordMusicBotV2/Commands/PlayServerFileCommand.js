const {SlashCommandBuilder} = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
    StreamType
} = require("@discordjs/voice");
const {join} = require("path");
const fs = require("node:fs");
// Get the queue from the index.js file
const queue = require("../index").queue;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play-server-file')
        .setDescription('Plays a file from the server.')
        .addStringOption(option => option.setName('filename').setDescription('The name of the file to play.').setRequired(true)),
    async execute(interaction, serverQueue) {
        // Get the filename from the interaction
        const filename = interaction.options.getString('filename');
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply('You need to join a voice channel first!');
        if (serverQueue) {
            // Delete serverQueue if it exists
            serverQueue.audioPlayer?.stop(true);
            queue.delete(interaction.guild.id);
        }
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
        // If the file does not exist, return
        if (!fs.existsSync(path)) {
            return await interaction.reply({content: "File not found!", ephemeral: true});
        }
        const resource = createAudioResource(path, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
        player.play(resource);
        connection.subscribe(player);
        await interaction.reply({content: `Playing ${filename}!`, ephemeral: true});
    }
}