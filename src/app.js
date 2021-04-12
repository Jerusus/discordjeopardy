const { ShardingManager } = require('discord.js');
const express = require('express');
const app = express();
const { get } = require('snekfetch');
const http = require('http');
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('ping');
});

server.listen(process.env.PORT, () => {
  console.log(`Listening on ${process.env.PORT}`);
});

// ping self to avoid heroku idling
setInterval(() => {
    get(process.env.HOST).then((r) => console.log(`Self ping`));
  }, 300000);

const manager = new ShardingManager('src/bot.js', {
    totalShards: 'auto',
    token: process.env.TOKEN
});

manager.on('shardCreate', (shard) => console.log(`Shard ${shard.id} launched`));
manager.spawn();
