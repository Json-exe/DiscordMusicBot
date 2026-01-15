import { ILinkParser } from '../LinkParserService.js';
import youtubeDl, { Payload } from 'youtube-dl-exec';

export default class YouTubeLinkParser implements ILinkParser {
	supportsLink(link: string): boolean {
		const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
		if (!ytRegex.test(link)) return false;
		// We do not support playlist links that contain index or watch parameters!
		return !(link.includes('list=') && (link.includes('index=') || link.includes('watch')));
	}

	async parseLink(link: string) {
		// Implementation for parsing YouTube links would go here.
		if (!this.supportsLink(link))
			throw new Error('YouTubeLinkParser requires a valid link! Be sure to call supportsLink first.');

		if (link.includes('list=')) {
			return this.parseYouTubePlaylist(link);
		} else {
			return this.parseYouTubeVideo(link);
		}
	}

	private async parseYouTubeVideo(link: string) {
		// Logic to parse a single YouTube video link
		console.log(`Parsing single YouTube video: ${link}`);
		try {
			const result = (await youtubeDl.youtubeDl(link, {})) as Payload;
			console.log(`YouTubeLinkParser video: ${result}`);
		} catch (error) {
			console.error(`Error parsing YouTube video: ${error}`);
		}
	}

	private async parseYouTubePlaylist(link: string) {
		// Logic to parse a YouTube playlist link
		console.log(`Parsing YouTube playlist: ${link}`);
	}
}
