import { Container } from 'inversify';
import LinkParserService, { ILinkParser } from '../Services/LinkParserService.js';
import AudioPlayerService from '../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from './models.js';

const container = new Container();

container.bind(ServiceIdentifiers.LinkParserService).to(LinkParserService).inSingletonScope();
container.bind(ServiceIdentifiers.AudioPlayerService).to(AudioPlayerService).inSingletonScope();
import YouTubeLinkParser from '../Services/Parser/YouTubeLinkParser.js';
import SpotifyLinkParser from '../Services/Parser/SpotifyLinkParser.js';
container.bind<ILinkParser>(ServiceIdentifiers.LinkParsers).to(YouTubeLinkParser).inSingletonScope();
container.bind<ILinkParser>(ServiceIdentifiers.LinkParsers).to(SpotifyLinkParser).inSingletonScope();

export default container;
