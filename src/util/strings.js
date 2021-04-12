const constants = require('../constants');
const stringSimilarity = require('string-similarity');

const questionWordRegex = /^(what is|what are|whats|what's|where is|where are|wheres|where's|who is|who are|whos|who's|when is|when are|whens|when's|why is|why are|whys|why's) /i;

// strip punctuation and crude check for question format
// returns truthy value if it is
function isQuestionFormat(text) {
  return text.replace(/[^\w\s]/i, '').match(questionWordRegex);
}

function isAnswerCorrect(text, answer) {
  text = text.replace(/[^a-zA-Z0-9 ]/g, '').replace(questionWordRegex, '');

  var similarity = stringSimilarity.compareTwoStrings(text, answer);

  // check if the user's submission matches the question's alternative answer (if any)
  var parenthesesRegex = /\(([^)]+)\)/;
  if (parenthesesRegex.test(answer)) {
    var matches = parenthesesRegex.exec(answer);
    if (isAnswerCorrect(text, matches[1])) {
      return true;
    }
    if (isAnswerCorrect(text, answer.replace(matches[0], ''))) {
      return true;
    }
  }

  // remove the beginning 'the' if it exists
  let articles = ['the', 'a', 'an'];
  for (let article of articles) {
    if (answer.indexOf(article + ' ') == 0) {
      if (isAnswerCorrect(text, answer.substring(article.length + 1))) {
        return true;
      }
    } else if (text.indexOf(article + ' ') == 0) {
      if (isAnswerCorrect(text.substring(article.length + 1), answer)) {
        return true;
      }
    } else if (text.indexOf(' ' + article + ' ') == 0) {
      if (isAnswerCorrect(text.substring(article.length + 2), answer)) {
        return true;
      }
    }
  }

  return similarity > constants.similarityThreshold;
}

module.exports = {
  isQuestionFormat,
  isAnswerCorrect,
};
