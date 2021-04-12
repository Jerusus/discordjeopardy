const Discord = require('discord.js');
const {
  AkairoClient,
  CommandHandler,
  ListenerHandler,
} = require('discord-akairo');
const constants = require('./constants');
const util = require('./util/jeopardy');
const db = require('./util/database');
const { Intents } = require('discord.js');

class DiscordJeopardyClient extends AkairoClient {
  constructor() {
    super(
      {
        ownerID: '175374170815725569',
      },
      {
        ws: {
          intents: [
            'GUILDS',
            'GUILD_MEMBERS',
            'GUILD_MESSAGES',
            'DIRECT_MESSAGES',
          ],
        },
      },
      {
        disableMentions: 'everyone',
      }
    );

    this.commandHandler = new CommandHandler(this, {
      directory: './src/commands/',
      prefix: constants.flag,
    });

    this.listenerHandler = new ListenerHandler(this, {
      directory: './src/listeners/',
    });

    this.commandHandler.loadAll();
    this.listenerHandler.loadAll();
  }
}

const client = new DiscordJeopardyClient();

client.login(process.env.TOKEN).then(() => {
  console.log('Logged in!');
});

// start auto channels if needed
setTimeout(() => {
  let startAutoChannels = (data) => {
    for (let item of data.Items) {
      const channelId = item.ChannelId;
      client.channels
        .fetch(channelId)
        .then((channel) => {
          channel
            .send('```diff\n+ ENDLESS JEOPARDY ON\n```')
            .then((message) => {
              if (util.getChannelState(channelId)) return;
              console.log(`Enabling auto game for ${channelId}`);
              util.startJeopardyAuto(message.channel);
            })
            .catch((err) => {
              // a failure usually indicates the bot no longer has permissions to post in the channel
              // console.log(
              //   `ChannelId ${channelId} gave the following error when attempting to send a message. Removing from DB.`
              // );
              // console.log(err);
              // util.setChannelState(channelId, false, true);
            });
        })
        .catch(() => {
          // console.log(`ChannelId ${channelId} not found. Removing from DB.`);
          // util.setChannelState(channelId, false, true);
        });
    }
  };

  db.scanChannels(startAutoChannels);
}, 15000);
