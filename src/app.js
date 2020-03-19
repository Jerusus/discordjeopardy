const Discord = require('discord.js');
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

client
  .login(process.env.TOKEN)
  .then(() => {
    console.log('Logged in!');
  })
  .catch(err => {
    console.log(err);
  });
