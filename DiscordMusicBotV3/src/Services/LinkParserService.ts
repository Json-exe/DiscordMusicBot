import { inject } from 'inversify';
import { ServiceIdentifiers } from '../util/models.js';

export default class LinkParserService {
	constructor(@inject(ServiceIdentifiers.LinkParsers) private parsers: ILinkParser[]) {}

	// Checks if any parser supports the given link and returns the parser if found.
	public checkLinkSupport(link: string): ILinkParser | undefined {
		return this.parsers.find((parser) => parser.supportsLink(link));
	}

	// Directly parses the link using the appropriate parser if supported and returns the parsed result.
	public parseLink(link: string) {
		for (const parser of this.parsers) {
			if (parser.supportsLink(link)) {
				return parser.parseLink(link);
			}
		}
		return null;
	}
}

export interface ILinkParser {
	parseLink(link: string): Promise<void>;
	supportsLink(link: string): boolean;
}
