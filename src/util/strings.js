const constants = require('../constants');
const stringSimilarity = require('string-similarity');

const questionWordRegex = /^(what is|what are|whats|what's|where is|where are|wheres|where's|who is|who are|whos|who's|when is|when are|whens|when's|why is|why are|whys|why's) /i;

// strip punctuation and crude check for question format
// returns truthy value if it is
function isQuestionFormat(text) {
  return text.replace(/[^\w\s]/i, '').match(questionWordRegex);
}

function isAnswerCorrect(text, answer) {
  text = text.replace(/[^\w\s]/i, '').replace(questionWordRegex, '');

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

module.exports = {
  isQuestionFormat,
  isAnswerCorrect,
};
