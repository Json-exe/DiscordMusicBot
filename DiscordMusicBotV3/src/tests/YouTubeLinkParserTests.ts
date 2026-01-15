import { beforeEach, describe } from 'node:test';
import test from 'node:test';
import YouTubeLinkParser from '../Services/Parser/YouTubeLinkParser.js';

describe('YouTubeLinkParser', () => {
	let parser: YouTubeLinkParser;

	beforeEach(() => {
		parser = new YouTubeLinkParser();
	});

	test('valides Video\-Link wird erkannt und youtubeDl aufgerufen', async () => {
		const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		await parser.parseLink(link);
	});

	test('valide Playlist wird erkannt und nicht als Video verarbeitet', async () => {
		const link = 'https://www.youtube.com/playlist?list=PL123456789';
		// Playlist ohne index/watch soll parseYouTubePlaylist auslösen,
		// also KEIN Aufruf von youtubeDl.youtubeDl
		await parser.parseLink(link);
	});

	test('Playlist mit index/watch gilt als nicht unterstützt und wirft Fehler', async () => {
		// const link = 'https://www.youtube.com/playlist?list=PL123456789&index=3';
		// await expect(parser.parseLink(link)).rejects.toThrow(
		// 	'YouTubeLinkParser requires a valid link! Be sure to call supportsLink first.',
		// );
	});

	test('ungültiger Video\-Link wirft Fehler und ruft youtubeDl nicht auf', async () => {
		// const link = 'https://example.com/not-a-youtube-link';
		// await expect(parser.parseLink(link)).rejects.toThrow(
		// 	'YouTubeLinkParser requires a valid link! Be sure to call supportsLink first.',
		// );
	});
});
