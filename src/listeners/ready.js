const { Listener } = require('discord-akairo');

class ReadyListener extends Listener {
  constructor() {
    super('ready', {
      emitter: 'client',
      event: 'ready',
    });
  }

  exec() {
    console.log(
      `DiscordJeopardy started. ${this.client.guilds.cache.size} guilds, ${this.client.channels.cache.size} channels, and ${this.client.users.cache.size} users.`
    );
    let bit = 0;
    let notices = [
      `"t.join" for Official DiscordJeopardy Server`,
      `"t.daily" for daily vote bonus`,
      `"t.help" for commands`,
      // `${this.client.users.cache.size.toLocaleString()} users`,
    ];
    this.client.user.setActivity(notices[0]);
    setInterval(() => {
      this.client.user.setActivity(notices[bit % notices.length]);
      bit++;
    }, 600000);
  }
}

module.exports = ReadyListener;
