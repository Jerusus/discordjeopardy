const Discord = require('discord.js');
const { AkairoClient } = require('discord-akairo');
const DBL = require('dblapi.js');
const constants = require('./constants');
const AWS = require('aws-sdk');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
  res.send('ping');
});

const tableName = 'PlayerData';
AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

const client = new AkairoClient(
  {
    prefix: constants.prefix,
    allowMention: true,
    commandDirectory: './src/commands/',
    listenerDirectory: './src/listeners/',
  },
  {
    disableEveryone: true,
  }
);

client.login(process.env.TOKEN).then(() => {
  console.log('Logged in!');
});

const dbl = new DBL(
  process.env.TOPGG_TOKEN,
  { webhookPort: process.env.PORT, webhookAuth: process.env.TOPGG_WEBHOOKAUTH },
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

setTimeout(() => {
  client.ws.connection.triggerReady();
}, 30000);

function grantVoteBonus(userId, multiplier) {
  var points = 1000 * multiplier;

  const readParams = {
    TableName: tableName,
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
          TableName: tableName,
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
            client.users
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
          TableName: tableName,
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
            client.users
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
