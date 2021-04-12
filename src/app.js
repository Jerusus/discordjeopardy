const { ShardingManager } = require('discord.js');
const express = require('express');
const app = express();
const { get } = require('snekfetch');
const http = require('http');
const server = http.createServer(app);
const DBL = require('dblapi.js');
const db = require('./util/database');

app.get('/', (req, res) => {
  res.send('ping');
});

server.listen(process.env.PORT, () => {
  console.log(`Listening on ${process.env.PORT}`);
});

// ping self to avoid heroku idling
setInterval(() => {
    get(process.env.HOST).then((r) => console.log(`Self ping`));
  }, 300000);

const manager = new ShardingManager('src/bot.js', {
    totalShards: 'auto',
    token: process.env.TOKEN
});

manager.on('shardCreate', (shard) => console.log(`Shard ${shard.id} launched`));
manager.spawn();

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

function grantVoteBonus(userId, multiplier) {
    var points = 1000 * multiplier;
    let successFxn = (value) => {
    //   let user = client.users.cache.get(userId);
    //   if (user) {
    //     user
    //       .send(
    //         `Thanks for voting! You just earned $${points.toLocaleString()}! Your score is now $${value.toLocaleString()}.`
    //       )
    //       .catch((err) => {
    //         logVoteMessageError(err, userId);
    //       });
    //   }
    };
    let errFxn = () => {
    //   let user = client.users.cache.get(userId);
    //   if (user) {
    //     user
    //       .send(
    //         `Thanks for voting! Err: Database down. (Sorry! Message the bot creator to complain!)`
    //       )
    //       .catch((err) => {
    //         logVoteMessageError(err, userId);
    //       });
    //   }
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