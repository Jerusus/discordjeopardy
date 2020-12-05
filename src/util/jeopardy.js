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

  let jeopardyObj = await getQuestion();

  channel.send(jeopardyObj.prompt);

  const finish = await new Promise((resolve, reject) => {
    handleMessages(resolve, channel, jeopardyObj, false);
  });
}

async function startJeopardyAuto(channel) {
  setChannelState(channel.id, true, true);

  let jeopardyObj = await getQuestion();

  channel.send(jeopardyObj.prompt);

  const finish = await new Promise((resolve, reject) => {
    handleMessages(resolve, channel, jeopardyObj, true);
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

function handleMessages(resolve, channel, j, isAuto) {
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
      if (str.isAnswerCorrect(text, j.answer)) {
        updatePlayerScore(m, j.value);
        collector.stop('correct');
      } else {
        updatePlayerScore(m, 0 - j.value);
      }
    }
  });
  collector.on('end', (m, reason) => {
    // time: timeout
    // restart: in non-auto, start a new round before current one is over
    // skip: in auto, skip question
    // correct: correct answer
    if (!(reason == 'correct')) {
      channel.send(
        `Time's up! The correct answer was **${j.normalizedAnswer}**.`
      );
    } else {
      channel.send(`The correct answer was **${j.normalizedAnswer}**.`);
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
  let normalizedAnswer = res.answer.replace(/<(?:.|\n)*?>/gm, '').toLowerCase();
  // clean up value
  let value = res.value;
  if (!value || value == null) {
    value = 200;
  }

  let prompt = `The category is **${res.category.title}** for $${value}:\n\`\`\`${res.question}\`\`\``;

  return new JeopardyObject(
    res.answer,
    normalizedAnswer,
    res.question,
    value,
    res.category,
    res.airdate,
    prompt
  );
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
