const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {version, changelog} = require("../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Shows the changelog for the bot.'),
    async execute(interaction, serverQueue) {
        await interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Current Changelog (${version}):`).setDescription(changelog).setColor(0x0000ff).setFooter({ text: `JasonMusic Version: ${version} | Made by jas_on`, iconURL: "https://cdn.discordapp.com/app-icons/1028372176878964808/095cf300281d0b859ba7738dba49087d.png?size=256"}) ], ephemeral: true});
    }
}