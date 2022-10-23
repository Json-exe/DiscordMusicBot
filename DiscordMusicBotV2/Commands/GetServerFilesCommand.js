const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get-server-files')
        .setDescription('Lists all available music files on the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, serverQueue) {
        try {
            const fs = require('node:fs');
            const path = require('path');
            const dir = path.join(__dirname, 'music');
            const files = fs.readdirSync(dir).filter(file => file.endsWith('.mp3'));
            let response = "";
            for (const file of files) {
                response += "- " + file + "\n";
            }
            await interaction.reply({ embeds: [ new EmbedBuilder().setTitle("Available music files:").setDescription(`${response}`).setColor(0x0000ff) ], ephemeral: true });
        } catch (e) {
            console.log(e);
        }
    }
}