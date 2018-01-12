const { Command } = require('discord-akairo');
const { get } = require('snekfetch');
const stringSimilarity = require('string-similarity');
const constants = require('../constants');

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
    console.log(answer);

    const finish = await new Promise((resolve, reject) => {
      const collector = message.channel.createMessageCollector(
        m => m.author.username != 'JeopardyBot',
        {
          time: constants.roundTime
        }
      );
      collector.on('collect', m => {
        if (m == 'quit' || m == constants.prefix + 'quit') {
          collector.stop(0);
        } else if (
          // check whether the message is another call to jeopardy
          constants.jeopardyAliases.indexOf(
            m.toString().substring(constants.prefix.length)
          ) > -1
        ) {
          // trying to start a new round
          collector.stop(2);
        } else if (isQuestionFormat(m)) {
          if (isAnswerCorrect(m, answer)) {
            // TODO update score and text below
            message.channel.send(
              `That is correct, ${
                m.author.username
              }! Your score is now +$${value} (TBD)`
            );
            collector.stop(3);
          } else {
            // TODO update score and text below
            message.channel.send(
              `That is incorrect, ${
                m.author.username
              }. Your score is now -$${value} (TBD)`
            );
          }
        }
      });
      collector.on('end', (m, reason) => {
        // 0: quit
        // 1: timeout (not ever passed)
        // 2: start a new round before current one is over
        // 3: correct answer
        if (!(reason == 3)) {
          message.channel.send(
            `Time's up! The correct answer was **${answer}**.`
          );
        }
        console.log(reason);
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
    answer.toLowerCase()
  );
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

module.exports = JeopardyCommand;
