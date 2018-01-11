const { Listener } = require('discord-akairo');
module.exports = class Ready extends Listener {
  constructor() {
    super('ready', {
      emitter: 'client',
      eventName: 'ready'
    });
  }

  exec() {
    console.log(
      `DiscordJeopardy started. ${this.client.guilds.size} guilds, ${this.client.channels.size} channels, and ${this
        .client.users.size} users.`
    );
  }
};
