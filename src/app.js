const Discord = require('discord.js');
const config = require('../config');
const { AkairoClient } = require('discord-akairo');
const constants = require('./constants');

const client = new AkairoClient(
  {
    prefix: constants.prefix,
    allowMention: true,
    commandDirectory: './src/commands/',
    listenerDirectory: './src/listeners/'
  },
  {
    disableEveryone: true
  }
);

client.login(config.token).then(() => {
  console.log('Logged in!');
});
