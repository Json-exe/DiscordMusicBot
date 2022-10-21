const { SlashCommandBuilder } = require('discord.js');
const {version, changelog} = require("../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Shows the changelog for the bot.'),
    async execute(interaction, serverQueue) {
        await interaction.reply({content: "Current changelog (" + version + "): " + changelog, ephemeral: true});
    }
}