const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {version, changelog} = require("../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Shows the changelog for the bot.'),
    async execute(interaction, serverQueue) {
        await interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Current Changelog (${version}):`).setDescription(changelog).setColor(0x0000ff) ], ephemeral: true});
    }
}