const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Sends feedback to the developer.')
        .addStringOption(option => option.setName('feedback').setDescription('The feedback to send.').setRequired(true)),
    async execute(interaction, serverQueue) {
        try {
            const modal = new ModalBuilder()
                .setCustomId("feedback-modal")
                .setTitle("Feedback");
            const feedback = new TextInputBuilder()
                .setCustomId("feedback-text")
                .setLabel("Feedback")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const row = new ActionRowBuilder().addComponents(feedback);
            modal.addComponents(row);
            await interaction.showModal(modal);
        } catch (e) {
            console.log(e);
        }
    }
}