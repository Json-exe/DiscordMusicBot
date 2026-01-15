import { Container } from 'inversify';
import LinkParserService, { ILinkParser } from '../Services/LinkParserService.js';
import AudioPlayerService from '../Services/AudioPlayerService.js';
import { ServiceIdentifiers } from './models.js';

const container = new Container();

container.bind(ServiceIdentifiers.LinkParserService).to(LinkParserService).inSingletonScope();
container.bind(ServiceIdentifiers.AudioPlayerService).to(AudioPlayerService).inSingletonScope();
// Register the YouTubeLinkParser as ILinkParser so that LinkParserService can use it
import YouTubeLinkParser from '../Services/Parser/YouTubeLinkParser.js';
const parsers: ILinkParser[] = [new YouTubeLinkParser()];
container.bind<ILinkParser[]>(ServiceIdentifiers.LinkParsers).toConstantValue(parsers);

export default container;
