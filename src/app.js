const Discord = require('discord.js');
const {
  AkairoClient,
  CommandHandler,
  ListenerHandler,
} = require('discord-akairo');
const DBL = require('dblapi.js');
const constants = require('./constants');
const util = require('./util/jeopardy');
const db = require('./util/database');
const express = require('express');
const http = require('http');
const { get } = require('snekfetch');
const { Intents } = require('discord.js');

const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('ping');
});

server.listen(process.env.PORT, () => {
  console.log(`Listening on ${process.env.PORT}`);
});

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
        shards: 'auto',
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

const dbl = new DBL(
  process.env.TOPGG_TOKEN,
  { webhookServer: server, webhookAuth: process.env.TOPGG_WEBHOOKAUTH },
  client
);

dbl.on('posted', () => {
  console.log('Server count posted!');
});

dbl.on('error', (e) => {
  console.log(`Oops! ${e}`);
});

dbl.webhook.on('ready', (hook) => {
  console.log(
    `Webhook running at http://${hook.hostname}:${hook.port}${hook.path}`
  );
});

dbl.webhook.on('vote', (vote) => {
  console.log(`User with ID ${vote.user} just voted!`);
  dbl.isWeekend().then((weekend) => {
    if (weekend) {
      grantVoteBonus(vote.user, 2);
    } else {
      grantVoteBonus(vote.user, 1);
    }
  });
});

// ping self to avoid heroku idling
setInterval(() => {
  get(process.env.HOST).then((r) => console.log(`Self ping`));
}, 300000);

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
              console.log(
                `ChannelId ${channelId} gave the following error when attempting to send a message. Removing from DB.`
              );
              console.log(err);
              util.setChannelState(channelId, false, true);
            });
        })
        .catch(() => {
          console.log(`ChannelId ${channelId} not found. Removing from DB.`);
          util.setChannelState(channelId, false, true);
        });
    }
  };

  db.scanChannels(startAutoChannels);
}, 15000);

function grantVoteBonus(userId, multiplier) {
  var points = 1000 * multiplier;
  let successFxn = (value) => {
    let user = client.users.cache.get(userId);
    if (user) {
      user
        .send(
          `Thanks for voting! You just earned $${points.toLocaleString()}! Your score is now $${value.toLocaleString()}.`
        )
        .catch((err) => {
          logVoteMessageError(err, userId);
        });
    }
  };
  let errFxn = () => {
    let user = client.users.cache.get(userId);
    if (user) {
      user
        .send(
          `Thanks for voting! Err: Database down. (Sorry! Message the bot creator to complain!)`
        )
        .catch((err) => {
          logVoteMessageError(err, userId);
        });
    }
  };
  db.upsertPlayer(userId, points, successFxn, errFxn);
}

function logVoteMessageError(err, userId) {
  // a failure usually indicates the bot is not allowed to message the user
  console.log(
    `UserId ${userId} gave the following error when attempting to send a message.`
  );
  console.log(err);
}
