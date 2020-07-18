const { get } = require('snekfetch');
const constants = require('../constants');
const AWS = require('aws-sdk');
const stringSimilarity = require('string-similarity');

// set up persistence for scores
AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

const channelState = {};
const questionWordRegex = /^(what is|what are|whats|what's|where is|where are|wheres|where's|who is|who are|whos|who's|when is|when are|whens|when's|why is|why are|whys|why's) /i;

function getChannelState(channelId) {
  return channelState[channelId];
}

function setChannelState(channelId, val) {
  channelState[channelId] = val;
  if (val) {
    const newParams = {
      TableName: constants.autoChannelTable,
      Item: {
        ChannelId: channelId,
      },
    };
    docClient.put(newParams, function (err, data) {
      if (err) {
        console.error(
          'Unable to add item. Error JSON:',
          JSON.stringify(err, null, 2)
        );
      }
    });
  } else {
    const deleteParams = {
      TableName: constants.autoChannelTable,
      Key: {
        ChannelId: channelId,
      },
    };
    docClient.delete(deleteParams, function (err, data) {
      if (err) {
        console.error(
          'Unable to delete item. Error JSON:',
          JSON.stringify(err, null, 2)
        );
      }
    });
  }
}

async function startJeopardyOnDemand(channel) {
  setChannelState(channel.id, true);

  let { answer, question, value, category } = await getQuestion();
  // clean up html elements
  answer = answer.replace(/<(?:.|\n)*?>/gm, '');
  // clean up value
  if (!value || value == null) {
    value = 200;
  }

  const prompt = `The category is **${category.title}** for $${value}:\n\`\`\`${question}\`\`\``;
  channel.send(prompt);

  const finish = await new Promise((resolve, reject) => {
    const collector = channel.createMessageCollector(
      (m) => m.author.username != 'JeopardyBot',
      {
        time: constants.roundTime,
      }
    );
    collector.on('collect', (m) => {
      if (
        m.toString().toLowerCase() === 'quit' ||
        m.toString().toLowerCase() === constants.prefix + 'quit'
      ) {
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
        channel.send(`Time's up! The correct answer was **${answer}**.`);
      } else {
        channel.send(`The correct answer was **${answer}**.`);
      }
      setChannelState(channel.id, false);
      return resolve(reason);
    });
  });
}

async function startJeopardyAuto(channel) {
  setChannelState(channel.id, true);

  let { answer, question, value, category } = await getQuestion();
  // clean up html elements
  answer = answer.replace(/<(?:.|\n)*?>/gm, '');
  // clean up value
  if (!value || value == null) {
    value = 200;
  }

  const prompt = `The category is **${category.title}** for $${value}:\n\`\`\`${question}\`\`\``;
  channel.send(prompt);

  const finish = await new Promise((resolve, reject) => {
    const collector = channel.createMessageCollector(
      (m) => m.author.username != 'JeopardyBot',
      {
        time: constants.autoRoundTime,
      }
    );
    collector.on('collect', (m) => {
      if (
        m.toString().toLowerCase() === 'quit' ||
        m.toString().toLowerCase() === constants.prefix + 'quit'
      ) {
        collector.stop('quit');
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
      // time: timeout
      // correct: correct answer
      if (!(reason == 'correct')) {
        channel.send(`Time's up! The correct answer was **${answer}**.`);
      } else {
        channel.send(`The correct answer was **${answer}**.`);
      }
      return resolve(reason);
    });
  });

  if (finish !== 'quit') {
    setTimeout(() => {
      startJeopardyAuto(channel);
    }, constants.jeopardyAutoCooldown);
  } else {
    channel.send('```diff\n- ENDLESS JEOPARDY OFF\n```');
    setChannelState(channel.id, false);
  }
}

async function getQuestion() {
  // grab the jeopardy question and parse
  const url = 'http://www.jservice.io/api/random';
  let res = JSON.parse((await get(url)).text)[0];
  if (
    !res.question ||
    !res.category ||
    res.question == 'null' ||
    res.question.trim() == '' ||
    res.question == '=' ||
    res.question.includes('audio clue') ||
    res.question.includes('seen here') ||
    res.answer == '='
  ) {
    res = getQuestion();
  }
  return res;
}

// strip punctuation and crude check for question format
// returns truthy value if it is
function isQuestionFormat(message) {
  let text = message.toString();
  return text.replace(/[^\w\s]/i, '').match(questionWordRegex);
}

function isAnswerCorrect(message, answer) {
  let text = message
    .toString()
    .replace(/[^\w\s]/i, '')
    .replace(questionWordRegex, '')
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

function updatePlayerScore(m, valueChange) {
  const correctness = valueChange > 0 ? 'correct' : 'incorrect';
  const excitement = valueChange > 0 ? '!' : '.';

  const readParams = {
    TableName: constants.playerTable,
    Key: {
      UserId: m.author.id,
    },
  };

  docClient.get(readParams, function (err, data) {
    if (err) {
      m.channel.send(
        `That is ${correctness}, ${m.author.username}${excitement} Err: Database down.`
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
          TableName: constants.playerTable,
          Item: {
            UserId: m.author.id,
            Score: Math.max(valueChange, 0),
          },
        };
        docClient.put(newParams, function (err, data) {
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
          TableName: constants.playerTable,
          Key: { UserId: m.author.id },
          UpdateExpression: 'set Score = :s',
          ExpressionAttributeValues: {
            ':s': Math.max(currentScore + valueChange, 0),
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
            m.channel.send(
              `That is ${correctness}, ${
                m.author.username
              }${excitement} Your score is now $${data.Attributes.Score.toLocaleString()}.`
            );
            console.log('Score:', data.Attributes.Score);
          }
        });
      }
    }
  });
}

module.exports = {
  getChannelState,
  setChannelState,
  startJeopardyOnDemand,
  startJeopardyAuto,
};
