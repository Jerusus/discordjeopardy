const AWS = require('aws-sdk');
const constants = require('../constants');

// set up persistence for scores
AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

let dbCache;
let cacheFresh = false;

// flag to disable database operations
const disableOps = false;

function getLeaderboard(userMap, message, displayLeaderboard) {
  if (disableOps) {
    console.log('Dev get leaderboard.');
    return;
  }

  if (cacheFresh) {
    console.log('Using db cache...');
    displayLeaderboard(dbCache, userMap, message);
  } else {
    scanPlayers(userMap, message, displayLeaderboard);
  }
}

function scanPlayers(userMap, message, displayLeaderboard) {
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
}

function scanChannels(startAutoChannels) {
  if (disableOps) {
    console.log('Dev scan channels.');
    return;
  }

  const scanParams = {
    TableName: constants.autoChannelTable,
  };

  docClient.scan(scanParams, function (err, data) {
    if (err) {
      console.error(
        'Unable to read item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      startAutoChannels(data);
    }
  });
}

function addAutoChannel(channelId) {
  if (disableOps) {
    console.log(`Dev add auto channel: ${channelId}`);
    return;
  }

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
    } else {
      console.log(`Added channel ${channelId} to DB.`);
    }
  });
}

function removeAutoChannel(channelId) {
  if (disableOps) {
    console.log(`Dev remove auto channel: ${channelId}`);
    return;
  }

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
    } else {
      console.log(`Deleted channel ${channelId} from DB.`);
    }
  });
}

function upsertPlayer(userId, valueChange, success, optErr) {
  if (disableOps) {
    console.log(`Dev upsert player: ${userId}`);
    return;
  }

  const readParams = {
    TableName: constants.playerTable,
    Key: {
      UserId: userId,
    },
  };

  docClient
    .get(readParams)
    .on('success', (response) => {
      if (response.data.Item == undefined) {
        // player doesn't exist in the db
        console.log('New player!', userId);
        putPlayer(userId, valueChange, success, optErr);
      } else {
        // player already exists
        currentScore = response.data.Item.Score;
        updatePlayer(userId, currentScore + valueChange, success, optErr);
      }
    })
    .on('error', (err) => {
      if (optErr) {
        optErr();
      }
      console.error(
        'Unable to update item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    })
    .send();
}

function putPlayer(userId, value, success, optErr) {
  // no negative scores
  value = Math.max(value, 0);

  const newParams = {
    TableName: constants.playerTable,
    Item: {
      UserId: userId,
      Score: value,
    },
  };

  docClient.put(newParams, function (err, data) {
    if (err) {
      if (optErr) {
        optErr();
      }
      console.error(
        'Unable to add item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      success(value);
    }
  });
}

function updatePlayer(userId, value, success, optErr) {
  // no negative scores
  value = Math.max(value, 0);

  const updateParams = {
    TableName: constants.playerTable,
    Key: { UserId: userId },
    UpdateExpression: 'set Score = :s',
    ExpressionAttributeValues: {
      ':s': value,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  docClient.update(updateParams, function (err, data) {
    if (err) {
      if (optErr) {
        optErr();
      }
      console.error(
        'Unable to update item. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      success(value);
    }
  });
}

module.exports = {
  getLeaderboard,
  scanChannels,
  addAutoChannel,
  removeAutoChannel,
  upsertPlayer,
};
