const Discord = require('discord.js');
const {
  AkairoClient,
  CommandHandler,
  ListenerHandler,
} = require('discord-akairo');
const DBL = require('dblapi.js');
const constants = require('./constants');
const util = require('./util/jeopardy');
const AWS = require('aws-sdk');
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

AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

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
  const scanParams = {
    TableName: constants.autoChannelTable,
  };
  docClient.scan(scanParams, function (err, data) {
    if (err) {
      console.error(
        'Unable to read item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      for (let item of data.Items) {
        const channelId = item.ChannelId;
        client.channels
          .fetch(channelId)
          .then((channel) => {
            channel
              .send('```diff\n+ ENDLESS JEOPARDY ON\n```')
              .then((message) => {
                console.log(`Enabling auto mode for ${channelId}.`);
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
    }
  });
}, 15000);

function grantVoteBonus(userId, multiplier) {
  var points = 1000 * multiplier;

  const readParams = {
    TableName: constants.playerTable,
    Key: {
      UserId: userId,
    },
  };

  docClient.get(readParams, function (err, data) {
    if (err) {
      console.error(
        'Unable to read item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      if (data.Item == undefined) {
        // player doesn't exist in the db
        console.log('New player!', userId);
        const newParams = {
          TableName: constants.playerTable,
          Item: {
            UserId: userId,
            Score: points,
          },
        };
        docClient.put(newParams, function (err, data) {
          if (err) {
            console.error(
              'Unable to add item. Error JSON:',
              JSON.stringify(err, null, 2)
            );
          } else {
            client.users.cache
              .get(userId)
              .send(
                `Thanks for voting! You just earned $${points.toLocaleString()}! Your score is now $${points.toLocaleString()}.`
              );
          }
        });
      } else {
        currentScore = data.Item.Score;

        // player already exists
        const updateParams = {
          TableName: constants.playerTable,
          Key: { UserId: userId },
          UpdateExpression: 'set Score = :s',
          ExpressionAttributeValues: {
            ':s': currentScore + points,
          },
          ReturnValues: 'UPDATED_NEW',
        };
        docClient.update(updateParams, function (err, data) {
          if (err) {
            console.error(
              'Unable to update item. Error JSON:',
              JSON.stringify(err, null, 2)
            );
          } else {
            client.users.cache
              .get(userId)
              .send(
                `Thanks for voting! You just earned $${points.toLocaleString()}! Your score is now $${data.Attributes.Score.toLocaleString()}.`
              );
          }
        });
      }
    }
  });
}
