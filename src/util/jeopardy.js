const { get } = require('snekfetch');
const constants = require('../constants');
const str = require('./strings');
const db = require('./database');

const channelState = {};

function getChannelState(channelId) {
  return channelState[channelId];
}

// auto is a boolean that signifies if there should be changes to the db's auto table
function setChannelState(channelId, val, auto) {
  channelState[channelId] = val;
  if (auto) {
    if (val) {
      db.addAutoChannel(channelId);
    } else {
      db.removeAutoChannel(channelId);
    }
  }
}

function JeopardyObject(
  answer,
  normalizedAnswer,
  question,
  value,
  category,
  airdate,
  prompt
) {
  this.answer = answer;
  this.normalizedAnswer = normalizedAnswer;
  this.question = question;
  this.value = value;
  this.category = category;
  this.airdate = airdate;
  this.prompt = prompt;
}

async function startJeopardyOnDemand(channel) {
  setChannelState(channel.id, true, false);

  let jObj = await getQuestion();

  channel.send(getPrompt(jObj));

  const finish = await new Promise((resolve, reject) => {
    handleMessages(resolve, channel, jObj, false);
  });
}

async function startJeopardyAuto(channel) {
  setChannelState(channel.id, true, true);

  let jObj = await getQuestion();

  channel.send(getPrompt(jObj));

  const finish = await new Promise((resolve, reject) => {
    handleMessages(resolve, channel, jObj, true);
  });

  if (finish !== 'quit') {
    setTimeout(() => {
      startJeopardyAuto(channel);
    }, constants.jeopardyAutoCooldown);
  } else {
    channel.send('```diff\n- ENDLESS JEOPARDY OFF\n```');
    setChannelState(channel.id, false, true);
  }
}

function handleMessages(resolve, channel, jObj, isAuto) {
  const collector = channel.createMessageCollector(
    (m) => m.author.username != 'JeopardyBot',
    {
      time: isAuto ? constants.autoRoundTime : constants.roundTime,
    }
  );
  collector.on('collect', (m) => {
    let text = m.toString().toLowerCase();
    if (text === 'quit' || text === constants.flag + 'quit') {
      collector.stop('quit');
    } else if (
      isAuto &&
      (text === 'skip' || text === constants.flag + 'skip')
    ) {
      collector.stop('skip');
    } else if (
      // check whether the message is another call to jeopardy
      !isAuto &&
      constants.jeopardyAliases.indexOf(text.substring(constants.flag.length)) >
        -1
    ) {
      // trying to start a new round
      collector.stop('restart');
    } else if (str.isQuestionFormat(text)) {
      if (str.isAnswerCorrect(text, jObj.normalizedAnswer)) {
        updatePlayerScore(m, jObj.value);
        collector.stop('correct');
      } else {
        updatePlayerScore(m, 0 - jObj.value);
      }
    }
  });
  collector.on('end', (m, reason) => {
    // time: timeout
    // restart: in non-auto, start a new round before current one is over
    // skip: in auto, skip question
    // correct: correct answer
    if (!(reason == 'correct')) {
      channel.send(`Time's up! The correct answer was **${jObj.answer}**.`);
    } else {
      channel.send(`The correct answer was **${jObj.answer}**.`);
    }
    if (!isAuto) {
      setChannelState(channel.id, false, false);
    }
    return resolve(reason);
  });
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
    res.answer.includes('----') ||
    res.answer == '='
  ) {
    return getQuestion();
  }

  // clean up html elements
  let answer = res.answer.replace(/<(?:.|\n)*?>/gm, '');
  // normalize answer for matching
  let normalizedAnswer = answer.replace(/[^a-zA-Z0-9() ]/g, '').toLowerCase();
  // clean up value
  let value = res.value;
  if (!value || value == null) {
    value = 200;
  }

  return new JeopardyObject(
    answer,
    normalizedAnswer,
    res.question,
    value,
    res.category,
    res.airdate
  );
}

function getPrompt(jObj) {
  return `The category is **${jObj.category.title}** for $${jObj.value}:\n\`\`\`${jObj.question}\`\`\``;
}

function updatePlayerScore(m, valueChange) {
  const correctness = valueChange > 0 ? 'correct' : 'incorrect';
  const excitement = valueChange > 0 ? '!' : '.';

  let successFxn = (value) => {
    m.channel.send(
      `That is ${correctness}, ${
        m.author.username
      }${excitement} Your score is now $${value.toLocaleString()}.`
    );
  };

  let errFxn = () => {
    m.channel.send(
      `That is ${correctness}, ${m.author.username}${excitement} Err: Database down.`
    );
  };

  db.upsertPlayer(m.author.id, valueChange, successFxn, errFxn);
}

module.exports = {
  getChannelState,
  setChannelState,
  startJeopardyOnDemand,
  startJeopardyAuto,
};
