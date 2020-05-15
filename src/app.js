const Discord = require('discord.js');
const { AkairoClient } = require('discord-akairo');
const DBL = require('dblapi.js');
const constants = require('./constants');

const client = new AkairoClient(
  {
    prefix: constants.prefix,
    allowMention: true,
    commandDirectory: './src/commands/',
    listenerDirectory: './src/listeners/',
  },
  {
    disableEveryone: true,
  }
);

client.login(process.env.TOKEN).then(() => {
  console.log('Logged in!');
});

const dbl = new DBL(
  process.env.TOPGG_TOKEN,
  { webhookPort: process.env.PORT, webhookAuth: process.env.TOPGG_WEBHOOKAUTH },
  client
);

dbl.on('posted', () => {
  console.log('Server count posted!');
});

dbl.on('error', (e) => {
  console.log(`Oops! ${e}`);
});

dbl.webhook.on('ready', (hook) => {
  console.log(
    `Webhook running at http://${hook.hostname}:${hook.port}${hook.path}`
  );
});

dbl.webhook.on('vote', (vote) => {
  console.log(`User with ID ${vote.user} just voted!`);
});

setTimeout(() => {
  client.ws.connection.triggerReady();
}, 30000);
