const { Command } = require('discord-akairo');
const constants = require('../constants');
const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

let dbCache;
let cacheFresh = false;

class LeaderboardCommand extends Command {
  constructor() {
    super('leaderboard', {
      aliases: constants.leaderboardAliases,
      channel: 'guild',
    });
  }

  exec(message) {
    message.guild.members.fetch().then(() => {
      const guildMembers = message.guild.members.cache.array();
      var userMap = {};
      for (let guildMember of guildMembers) {
        const user = guildMember.user;
        userMap[user.id] = user.username;
      }

      if (cacheFresh) {
        console.log('Using db cache...');
        displayLeaderboard(dbCache, userMap, message);
        return;
      }

      var scanParams = {
        TableName: constants.playerTable,
      };
      console.log('Scanning db...');
      docClient.scan(scanParams, function (err, data) {
        if (err) {
          console.error(
            'Unable to read item. Error JSON:',
            JSON.stringify(err, null, 2)
          );
        } else {
          cacheFresh = true;
          dbCache = data;
          setTimeout(() => {
            cacheFresh = false;
          }, constants.leaderboardCooldown);

          displayLeaderboard(data, userMap, message);
        }
      });
    });
  }
}

function displayLeaderboard(data, userMap, message) {
  var scores = [];
  for (let item of data.Items) {
    if (!(item.UserId in userMap)) {
      continue;
    }
    var curScoreObject = new ScoreObject(
      item.UserId,
      userMap[item.UserId],
      item.Score
    );
    scores.push(curScoreObject);
  }
  console.log(scores);
  scores.sort((a, b) => {
    return b.score - a.score;
  });
  var msg = '**Here are the top scores on this server:**\n```\n';
  msg += '+----------------------------------------------------+\n';
  for (var i = 0; i < 10 && i < scores.length; i++) {
    if (scores[i].score <= 0) {
      break;
    }
    var rank = i + 1;
    msg += `| ${(rank + '.').padEnd(4)}${scores[i].username.padEnd(33)}${
      ('$' + scores[i].score.toLocaleString()).padStart(13) + ' |\n'
    }`;
  }
  msg += '+----------------------------------------------------+\n';
  msg += '```';
  message.channel.send(msg);
}

function ScoreObject(userId, username, score) {
  this.userId = userId;
  this.username = username;
  this.score = score;
}

module.exports = LeaderboardCommand;
