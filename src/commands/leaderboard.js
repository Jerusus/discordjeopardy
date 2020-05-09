const { Command } = require('discord-akairo');
const constants = require('../constants');
const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-west-2'
});

const docClient = new AWS.DynamoDB.DocumentClient();

let dbCache;
let cacheFresh = false;

class LeaderboardCommand extends Command {
  constructor() {
    super('leaderboard', {
      aliases: constants.leaderboardAliases,
      channelRestriction: 'guild'
    });
  }

  exec(message) {
    if (!message.guild) return;
    const guildMembers = message.guild.members.array();
    var scores = [];
    var userMap = {};
    for (let guildMember of guildMembers) {
      const user = guildMember.user;
      userMap[user.id] = user.username;
    }
    var scanParams = {
      TableName: 'PlayerData'
    };
    if (!cacheFresh) {
      console.log('Scanning db...');
      docClient.scan(scanParams, function(err, data) {
        if (err) {
          console.error(
            'Unable to read item. Error JSON:',
            JSON.stringify(err, null, 2)
          );
        } else {
          cacheFresh = true;
          setTimeout(() => {
            cacheFresh = false;
          }, constants.leaderboardCooldown);

          displayScore(data, userMap, message);
        }
      });
    } else {
      console.log('Using db cache...');
      displayScore(dbCache, userMap, message);
    }
  }
}

function displayScore(data, userMap, message) {
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
  for (var i = 0; i < 5 && i < scores.length; i++) {
    var rank = i + 1;
    msg += `| ${rank}. ${scores[i].username.padEnd(34)}${(
      '$' + scores[i].score.toLocaleString()
    ).padStart(13) + ' |\n'}`;
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
