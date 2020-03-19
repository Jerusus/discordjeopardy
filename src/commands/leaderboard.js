const { Command } = require('discord-akairo');
const constants = require('../constants');
const AWS = require('aws-sdk');

const tableName = 'PlayerData';
AWS.config.update({
  region: 'us-west-2'
});

const docClient = new AWS.DynamoDB.DocumentClient();

class LeaderboardCommand extends Command {
  constructor() {
    super('leaderboard', {
      aliases: constants.leaderboardAliases,
      channelRestriction: 'guild',
      cooldown: constants.leaderboardCooldown
    });
  }

  exec(message) {
    if (!message.guild) return;
    // message.channel.send("Here's the top scores of the server:");
    const guildMembers = message.guild.members.array();
    var scores = {};
    var promises = [];
    var batchReadParams = {
      RequestItems: {
        tableName: {
          Key: []
        }
      }
    };
    for (let guildMember of guildMembers) {
      const user = guildMember.user;
      if (user.username == 'JeopardyBot') continue;
      batchReadParams.RequestItems.tableName.Key.push({ UserId: user.id });
    }
    docClient.batchGet(batchReadParams, function(err, data) {
      if (err) {
        console.error(
          'Unable to read item. Error JSON:',
          JSON.stringify(err, null, 2)
        );
      } else {
        console.log(data.Responses);
        // if (data.Item == undefined) return;
        // console.log('Fetched score: ', data.Item.Score);
        // scores[user.username] = data.Item.Score;
      }
    });
    // Promise.all(promises).then(() => {
    //   console.log(scores);
    // });
  }
}

module.exports = LeaderboardCommand;
