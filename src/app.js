const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('bot.js', {
    totalShards: 'auto',
    token: process.env.TOKEN
});

manager.on('shardCreate', (shard) => console.log(`Shard ${shard.id} launched`));
manager.spawn();
