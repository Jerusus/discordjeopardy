const Discord = require('discord.js');
const config = require('../config');
const { AkairoClient } = require('discord-akairo');

const client = new AkairoClient(
  {
    prefix: 't.',
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
