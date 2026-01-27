# DiscordMusicBot V3

Ein modular aufgebauter Discord-Musikbot auf Basis von `discord.js`, Lavalink und TypeScript. Diese Version bringt eine stark typisierte Codebasis, strukturierte Slash-Commands und eine optionale Container-Infrastruktur, damit der Bot reproduzierbar betrieben werden kann.

## Voraussetzungen
- Node.js >= 22.12 (LTS) inklusive `corepack` (liefert pnpm mit)
- pnpm (automatisch über `corepack enable` verfügbar)
- Ein laufender Lavalink-Server (lokal, extern oder via Docker Compose)
- Ein Discord-Bot mit Token sowie Application-ID

## Projektstruktur (Auszug)
```
DiscordMusicBotV3/
├─ src/                   # TypeScript-Quellcode
├─ dist/                  # Kompilierte Dateien nach `pnpm build`
├─ music/                 # Lokale Audiodateien, die via Slash-Command gespielt werden können
├─ Dockerfile             # Multi-Stage Build für den Bot
├─ docker-compose.yml     # Compose-Stack mit Bot + Lavalink
├─ .env.sample            # Vorlage für benötigte Environment-Variablen
└─ README.md
```

## Lokales Setup
1. Abhängigkeiten installieren:
   ```bash
   pnpm install
   ```
2. `.env` anlegen (siehe `.env.sample`) und mit deinen Discord-/Lavalink-Daten füllen.
3. Entwicklung starten (Hot Reload via `tsx`):
   ```bash
   pnpm dev
   ```
4. Für Produktion bauen und starten:
   ```bash
   pnpm build
   pnpm start
   ```

Slash-Commands neu registrieren:
```bash
pnpm deploy
```
(benötigt `DISCORD_TOKEN` und `APPLICATION_ID` in deiner `.env`)

## Docker
### Image bauen und laufen lassen
```bash
docker build -t discord-music-bot:v3 .
docker run \
  --env-file .env \
  -v ${PWD}/music:/app/music \
  --name discord-music-bot \
  discord-music-bot:v3
```

### Docker Compose Stack
Die bereitgestellte `docker-compose.yml` enthält den Bot und einen Lavalink-Container.

```bash
cp .env.sample .env
# Passe mindestens DISCORD_TOKEN & APPLICATION_ID an.
# Für Compose empfiehlt sich: LAVALINK_HOST=lavalink

docker compose up --build -d
```

Der `music/`-Ordner wird automatisch ins Bot-Container-Verzeichnis gemountet. Passe Ports/Volumes nach Bedarf an. Wenn du einen externen Lavalink nutzt, setze `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_SECURE` und entferne den Compose-Service.

## Environment-Variablen
| Name | Pflicht | Default | Beschreibung |
|------|---------|---------|--------------|
| `DISCORD_TOKEN` | Ja | – | Bot-Token aus dem Discord Developer Portal. |
| `APPLICATION_ID` | Ja | – | Client/Application ID, wird für Slash-Command-Deployments benötigt. |
| `BOT_USERNAME` | Nein | `JasonMusic` | Anzeigename, den der Bot an Lavalink meldet. |
| `LAVALINK_HOST` | Nein | `localhost` | Hostname bzw. Service-Name deines Lavalink-Servers. |
| `LAVALINK_PORT` | Nein | `2333` | Port deines Lavalink-Servers. |
| `LAVALINK_AUTH` | Nein | `youshallnotpass` | Passwort, das Lavalink erwartet. |
| `LAVALINK_NODE_ID` | Nein | `testnode` | Bezeichner des Lavalink-Nodes (für Multi-Node-Setups). |
| `LAVALINK_SECURE` | Nein | `false` | `true`, falls Lavalink via HTTPS/WSS angesprochen werden soll. |
| `FOOTER_TEXT` | Nein | `Powered by DiscordJS` | Footer-Text für Embeds. |
| `FOOTER_ICON_URL` | Nein | – | Footer-Icon bzw. Fallback-Artwork für Embeds. |
| `VERSION` | Nein | – | Wird vom `/changelog`-Command als Versionslabel genutzt. |
| `CHANGELOG` | Nein | – | Inhalt, den `/changelog` anzeigt (Markdown erlaubt). |

Tipp: Für den Compose-Stack `LAVALINK_HOST=lavalink` setzen, damit der Bot das interne Netzwerk nutzt.

## Nützliche Skripte
| Kommando | Zweck |
|----------|-------|
| `pnpm dev` | Startet den Bot in der Entwicklungsumgebung mit Hot Reload. |
| `pnpm build` | Kompiliert TypeScript nach `dist/`. |
| `pnpm start` | Startet die gebaute Version (`dist/index.js`). |
| `pnpm deploy` | Registriert Slash-Commands global über die REST-API. |
| `pnpm lint` | Führt Prettier + ESLint aus. |

## Fehlerbehebung
- Stelle sicher, dass `@discordjs/opus` und `ffmpeg` verfügbar sind. Das Dockerfile installiert `ffmpeg` automatisch.
- Falls Lavalink im Compose-Stack startet, aber der Bot keine Verbindung bekommt: stimmt das Passwort (`LAVALINK_AUTH`) überein und zeigt `docker compose logs lavalink` keine Fehler?
- Für lokale Lavalink-Instanzen muss der Server vor dem Bot laufen.

Viel Spaß beim Musikhören! 🎵
