const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {joinVoiceChannel} = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join-voice')
        .setDescription('Joins the voice channel of the user who sent the command.'),
    async execute(interaction, serverQueue) {
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
        await console.log("Joined Voice Channel " + channel.name);
        await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Joined Voice Channel :thumbsup:").setColor(0x00ff00) ], ephemeral: true });
    }
}