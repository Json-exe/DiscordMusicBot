import { Player } from 'lavalink-client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Message, User } from 'discord.js';
import { footerOptions } from '../util/utilities.js';

export default class JasonMusicPlayer extends Player {
	queueEndTimer?: NodeJS.Timeout;
	currentNpMessage?: Message;

	sendNpMessage = async (client: Client) => {
		const npChannel = client.channels.cache.get(this.options.textChannelId!);
		if (!npChannel || !npChannel.isSendable() || !('guild' in npChannel)) return;
		const fields = [
			{ name: 'Duration', value: `${this.getHumanReadableDuration(this.queue.current?.info.duration)}`, inline: true },
		];
		if (this.queue.current?.requester && this.queue.current.requester instanceof User) {
			fields.push({ name: 'Requested by', value: `<@${this.queue.current?.requester.username}>`, inline: true });
		}
		const npEmbed = new EmbedBuilder()
			.setTitle(`Now Playing ${this.queue.current?.info.title}`)
			.setColor(0x0000ff)
			.addFields(fields)
			.setFooter(footerOptions);

		if (this.queue.current?.info.artworkUrl) {
			npEmbed.setThumbnail(this.queue.current.info.artworkUrl);
		}
		if (this.queue.current?.info.author) {
			npEmbed.setAuthor({
				name: this.queue.current.info.author,
			});
		}
		if (this.queue.current?.info.uri) {
			npEmbed.setURL(this.queue.current.info.uri);
		}

		const row = this.createNowPlayingComponents();
		try {
			if (this.currentNpMessage) {
				const row_disabled = this.createNowPlayingComponents(true);
				await this.currentNpMessage.edit({ components: [row_disabled.toJSON()] });
			}
		} catch (e) {
			console.log('Error editing previous message:');
			console.error(e);
		}

		this.currentNpMessage = await npChannel.send({ embeds: [npEmbed], components: [row.toJSON()] });
	};

	updateControls = async () => {
		if (!this.currentNpMessage) return;
		const row = this.createNowPlayingComponents();
		this.currentNpMessage = await this.currentNpMessage.edit({ components: [row.toJSON()] });
	};

	getHumanReadableDuration = (durationMs?: number) => {
		if (!durationMs) return 'Unknown duration or LIVE';
		const totalSeconds = Math.floor(durationMs / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const parts = [];
		if (hours > 0) parts.push(`${hours}h`);
		if (minutes > 0) parts.push(`${minutes}m`);
		parts.push(`${seconds}s`);

		return parts.join(' ');
	};

	createNowPlayingComponents = (disableAll: boolean = false) => {
		const hasPreviousSongs = this.queue.previous.length > 0;
		const hasMoreQueuedSongs = this.queue.tracks.length > 0;
		const skipButton = new ButtonBuilder()
			.setCustomId('skip')
			.setLabel('⏭️')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(!hasMoreQueuedSongs || disableAll);
		const playPauseButton = new ButtonBuilder()
			.setCustomId('play_pause')
			.setLabel('⏯️')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disableAll);
		const previousButton = new ButtonBuilder()
			.setCustomId('previous')
			.setLabel('⏮️')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(!hasPreviousSongs || disableAll);
		const stopButton = new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger);
		return new ActionRowBuilder().addComponents(previousButton, playPauseButton, skipButton, stopButton);
	};

	startQueueEndTimer = async (client: Client) => {
		if (this.queueEndTimer) {
			clearTimeout(this.queueEndTimer);
		}

		const npChannel = client.channels.cache.get(this.options.textChannelId!);
		if (!npChannel || !npChannel.isSendable() || !('guild' in npChannel)) return;
		await npChannel.send({
			content: 'The queue has ended and the bot will leave the voice channel in 10 minutes if no other song is queued.',
		});

		this.queueEndTimer = setTimeout(async () => {
			const npChannel = client.channels.cache.get(this.options.textChannelId!);
			if (npChannel && npChannel.isSendable() && 'guild' in npChannel) {
				await npChannel.send({ content: 'The bot was inactive for 10 minutes and will now leave the voice channel.' });
			}
			this.queueEndTimer = undefined;
			await this.destroy();
		}, 600_000); // 10 minutes
	};

	stopQueueEndTimer = () => {
		if (this.queueEndTimer) {
			clearTimeout(this.queueEndTimer);
		}
	};
}
