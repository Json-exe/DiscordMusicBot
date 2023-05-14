- [Instructions](#instructions)
  - [First: Install Dependencys](#first-install-dependencys)
  - [Second: Restore bot dependencys](#second-restore-bot-dependencys)
  - [Third: Configure the bot](#third-configure-the-bot)
    - [Create a bot on the discord developer portal and get the needed values](#create-a-bot-on-the-discord-developer-portal-and-get-the-needed-values)
    - [Add the bot to your server](#add-the-bot-to-your-server)
  - [Fourth: Register bot commands](#fourth-register-bot-commands)
  - [Fifth: Have fun!](#fifth-have-fun)
- [Bot Commands](#bot-commands)
- [Server local music](#server-local-music)
- [Spotify support](#spotify-support)
  - [Step 1: Create a Spotify App](#step-1-create-a-spotify-app)
  - [Step 2: Authorize the bot and spotify](#step-2-authorize-the-bot-and-spotify)

# Instructions
This file will help you setting up the bot and running it on your system

---
## First: Install Dependencys
The following tutorial will help you to install all necessary dependencys for the bot to run.

| Dependency Name | Version |                 URL |
|-----------------|---------|---------------------|
| NodeJS          | >=18.13 | https://nodejs.org/ |
| NPM (Comes with NodeJS)| | https://www.npmjs.com/ |

---
## Second: Restore bot dependencys
After you have installed the Dependencys of the first step you can now start by restoring the dependencys the bot needs.
Run the following command inside your terminal:

`npm install`

Check that youre in the directory that the bots files are in!
The process can take some time dependening on your Internet. If you want to Update the dependencys of the bot run:

`npm update`

This will update all packages that the bot needs.
If you dit this you will find a folder named: node_modules. This folder contains all the packages that has been installed. If you want to check the installed packages run:

`npm list`

Here is a list of all the packages the bot needs, be sure that the bot has all these packages installed and the version >= than the listed one:
| Dependency Name | Version |
|-----------------|---------|
| @discordjs/opus | 0.9.0 |
| @discordjs/voice| 0.16.0|
|discord.js|14.9.0|
|ffmpeg-static|5.1.0|
|ffmpeg|0.0.4|
|isomorphic-unfetch|3.1.0|
|libsodium-wrappers|0.7.11|
|opusscript|0.0.8|
|play-dl|1.9.6|
|sodium-native|3.4.1|
|tweetnacl|1.0.3|
|ytdl-core|4.11.3|

---
## Third: Configure the bot
Now everything is ready to start the bot, almost! Only one last step: We have to configure the bot probperly to run.
Inside the bot folder you will find a file named: config.json. Inside this file you have to change some of the values.
### Create a bot on the discord developer portal and get the needed values
Before you can start changing the values you have to create a bot on the discord developer portal. You will find it here: https://discord.com/developers/applications

If you are not logged-in, log in. Then click on the blue button in the top right corner saying "New Application". Give this App a name. 

After you click "Create" you will be redirected to the App detail page. On the Tab "General Information" you will find your Application ID. Copy this and replace this `<your bot applicationId>` with your ID in the file.

Next you have to navigate to the tab named "Bot", on this tab there you click Add Bot if you dont already have a bot associated with your app. On this page you will find the Token of the bot. Copy it and replace this `<your bot token>` with the token of your bot.

Now you have to set up servers, that are allowed to use the bot. For this go to discord (Web or Client) and right-click the server you want to add the bot to. In the context menu click on Copy Server ID. If this option is not listed, go to Settings>Extended and Check if "Developermode" is checked. After that copy the id and replace: `<server-id you want to grant access>` with the id of the server. You can add more than one server but if you only want one, remove this from the file `, "<server-id you want to grant access>"`.

The fields `changelog` and `version` can be freely adjusted by you to fit your needs.

### Add the bot to your server

Now you need to invite your bot to the servers you added inside the config file. For this go to the discord developer portal, click your app, click on the tab OAuth2, click on URL Generator and tick: bot and applications.commands. Then scroll down a little and check the permissions you would to give the bot. Than copy the URL and paste it inside your browser. Be sure that you have selected the right permissions for the bot to propberly work! Here is a list of permissions the bot is needing to work:

| Permissions |
|-----------------|
| Read Messages/View Channels |
| Send Messages |
| Send Messages in Threads |
| Manage Messages |
| Read Message History |
| Add Reactions |
| Connect |
| Speak |
| Use Voice Activity |

---
## Fourth: Register bot commands
To use the bot you have to register the bot commands to your added server. THIS STEP REQUIRES STEP 3 TO BE COMPLETED!
Open up a new terminal, if you dont already have one open, and navigate to the bots folder. Now run the following command to register your commands: 

`node command-deploy.js -deploy`

This will deploy the bot commands to all your servers defined inside the config file.

If everything went right, you can type / in the chat and should see the bot commands. It can take some time for discord to realize that the commands have been registered. If you think it did not work, try it again.

---
## Fifth: Have fun!
Now that you have completed this instruction, you can easily run the following command inside your terminal to start the bot:

`node index.js`

And now the Bot is live! Have fun listening to music. A list of all commands follows to this instructions.

---
# Bot Commands

|Commmand|Explanation|
|--------|-----------|
|/play `<url>`|Plays a song from the given URL|
|/stop|Destroys the bot connection|
|/search `<search-pattern>`|Search for a Specific song on youtube|
|/loop|Enables/Disables looping of the current track|
|/showqueue|Shows the top 10 Songs in the queue|
|/clearqueue|Clears the queue|
|/changelog|Shows the changelog|
|/feedback|Lets you submit a feedback|
|/join-voice|Joins your voice channel|
|/pause-unpause|Pauses and unpauses the music|
|/skip `<amount>`|Skips the given amount of songs|
|/reset-music-channel|Resets the music channel to the current channel|
|/play-server-file `<filename>`|Plays a file that is on the server|
|/get-server-files **(ADMIN ONLY)**|Shows all the files available on the server|

---
# Server local music
If you want to play music directly from the server you have to create a folder named "music" inside the "Commands" folder so that your folder structure looks something like this: "Commands\Music". After that you can upload your music files in that folder. **ATTENTION: Only mp3 files are allowed!**

---
# Spotify support
If you tried spotify links you may have noticed that they dont work. But dont worry! You only have to set spotify up, that the bot can use it. And here is how:

## Step 1: Create a Spotify App
Go to: https://developer.spotify.com/dashboard and log in with your account.
Now click on "Create app". Spotify will ask you some data you have to input in order to successfully create a app. When it ask you for a Redirect URI just enter this:

`http://127.0.0.1/index.html`

If you done this you will find your app on the Dashboard. When you click on it you will get more details. 
On the Details page you click on Settings. In the Settings tab you will find your client ID and your client secret. Make sure to copy these because you will need them later. Also you need your redirect URI. Now you can close the page and do the next step.


## Step 2: Authorize the bot and spotify
Go into your bots folder and open a Terminal there. Now enter the following command:

`node AuthorizeSetup.js`

When you run this a interface will come and ask you some questions. Be sure that you select Spotify in this interface to set it up. And that you select **yes** when it asks you to save the data in a file. Then it prompts you to enter your client ID and your client secret. After that you have to provide your redirect URI. 

**Attention: This process is not provided by me. Its provided by the library play-dl. For more information please considere visiting their [GitHub](https://github.com/play-dl/play-dl)**