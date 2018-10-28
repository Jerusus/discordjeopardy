const { Command } = require('discord-akairo');
const { get } = require('snekfetch');
const stringSimilarity = require('string-similarity');
const constants = require('../constants');
const AWS = require('aws-sdk');
// const fs = require('fs');

// set up persistence for scores
const tableName = 'PlayerData';
AWS.config.update({
  region: 'us-west-2'
});

const docClient = new AWS.DynamoDB.DocumentClient();

// console.log('Importing player data into DynamoDB...');
// const players = JSON.parse(fs.readFileSync('./data/playerdata.json', 'utf8'));
// players.forEach(function(player) {
//   var params = {
//     TableName: tableName,
//     Item: {
//       UserId: player.UserId,
//       Score: player.Score
//     }
//   };

//   docClient.put(params, function(err, data) {
//     if (err) {
//       console.error(
//         'Unable to add entry',
//         player.UserId,
//         '. Error JSON:',
//         JSON.stringify(err, null, 2)
//       );
//     } else {
//       console.log('PutItem succeeded:', player.UserId);
//     }
//   });
// });
// console.log('Done importing!');

class JeopardyCommand extends Command {
  constructor() {
    super('jeopardy', {
      aliases: constants.jeopardyAliases,
      channelRestriction: 'guild',
      cooldown: constants.jeopardyCooldown
    });
  }

  async exec(message) {
    console.log(`Jeopardy game started by ${message.author.tag}`);

    let { answer, question, value, category } = await getQuestion();
    // clean up html elements
    answer = answer.replace(/<(?:.|\n)*?>/gm, '');
    // clean up value
    if (!value || value == null) {
      value = 200;
    }

    const prompt = `The category is **${
      category.title
    }** for $${value}:\n\`\`\`${question}\`\`\``;
    message.channel.send(prompt);

    // TODO get rid of this, you cheater
    console.log('Answer:', answer);

    const finish = await new Promise((resolve, reject) => {
      const collector = message.channel.createMessageCollector(
        m => m.author.username != 'JeopardyBot',
        {
          time: constants.roundTime
        }
      );
      collector.on('collect', m => {
        if (m == 'quit' || m == constants.prefix + 'quit') {
          collector.stop('quit');
        } else if (
          // check whether the message is another call to jeopardy
          constants.jeopardyAliases.indexOf(
            m.toString().substring(constants.prefix.length)
          ) > -1
        ) {
          // trying to start a new round
          collector.stop('restart');
        } else if (isQuestionFormat(m)) {
          if (isAnswerCorrect(m, answer)) {
            updatePlayerScore(m, value);
            collector.stop('correct');
          } else {
            updatePlayerScore(m, 0 - value);
          }
        }
      });
      collector.on('end', (m, reason) => {
        // quit: quit
        // time: timeout
        // restart: start a new round before current one is over
        // correct: correct answer
        if (!(reason == 'correct')) {
          message.channel.send(
            `Time's up! The correct answer was **${answer}**.`
          );
        } else {
          message.channel.send(`The correct answer was **${answer}**.`);
        }
        return resolve(reason);
      });
    });

    // TODO logic depending on the value of 'finish', from resolve
    console.log('Round finished!');
    return;
  }
}

async function getQuestion() {
  // grab the jeopardy question and parse
  const url = 'http://www.jservice.io/api/random';
  let res = JSON.parse((await get(url)).text)[0];
  if (
    !res.question ||
    res.question == 'null' ||
    res.question.trim() == '' ||
    res.question == '=' ||
    res.answer == '='
  ) {
    res = getQuestion();
  }
  return res;
}

function isAnswerCorrect(message, answer) {
  let text = message
    .toString()
    .replace(/[^\w\s]/i, '')
    .replace(
      /^(what is|what are|whats|where is|where are|wheres|who is|who are|whos) /i,
      ''
    )
    .toLowerCase();
  var similarity = stringSimilarity.compareTwoStrings(
    text,
    answer.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
  );

  // check if the user's submission matches the question's alternative answer (if any)
  var parenthesesRegex = /\(([^)]+)\)/;
  if (parenthesesRegex.test(answer)) {
    var matches = parenthesesRegex.exec(answer);
    if (isAnswerCorrect(text, matches[1])) {
      return true;
    }
    let exclude = answer.split(matches[0]);
    if (isAnswerCorrect(text, exclude[0])) {
      return true;
    }
  }

  if (similarity > constants.similarityThreshold) {
    return true;
  } else {
    return false;
  }
}

// strip punctuation and crude check for question format
// returns truthy value if it is
function isQuestionFormat(message) {
  let text = message.toString();
  return text
    .replace(/[^\w\s]/i, '')
    .match(
      /^(what is|what are|whats|where is|where are|wheres|who is|who are|whos) /i
    );
}

function updatePlayerScore(m, valueChange) {
  const correctness = valueChange > 0 ? 'correct' : 'incorrect';
  const excitement = valueChange > 0 ? '!' : '.';

  const readParams = {
    TableName: tableName,
    Key: {
      UserId: m.author.id
    }
  };

  docClient.get(readParams, function(err, data) {
    if (err) {
      m.channel.send(
        `That is ${correctness}, ${
          m.author.username
        }${excitement} Err: Database down.`
      );
      console.error(
        'Unable to read item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      if (data.Item == undefined) {
        // player doesn't exist in the db
        console.log('New player!', m.author.id);
        const newParams = {
          TableName: tableName,
          Item: {
            UserId: m.author.id,
            Score: valueChange
          }
        };
        docClient.put(newParams, function(err, data) {
          if (err) {
            console.error(
              'Unable to add item. Error JSON:',
              JSON.stringify(err, null, 2)
            );
          } else {
            m.channel.send(
              `That is ${correctness}, ${
                m.author.username
              }${excitement} Your score is now $${valueChange.toLocaleString()}.`
            );
          }
        });
      } else {
        currentScore = data.Item.Score;

        // player already exists
        const updateParams = {
          TableName: tableName,
          Key: { UserId: m.author.id },
          UpdateExpression: 'set Score = :s',
          ExpressionAttributeValues: {
            ':s': currentScore + valueChange
          },
          ReturnValues: 'UPDATED_NEW'
        };
        docClient.update(updateParams, function(err, data) {
          if (err) {
            console.error(
              'Unable to update item. Error JSON:',
              JSON.stringify(err, null, 2)
            );
          } else {
            m.channel.send(
              `That is ${correctness}, ${
                m.author.username
              }${excitement} Your score is now $${data.Attributes.Score.toLocaleString()}.`
            );
          }
        });
      }
    }
  });
}

module.exports = JeopardyCommand;
