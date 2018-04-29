exports.commands = [];
exports.commands.ping = {
	usage: '',
	description: 'Shows latency.',
	command: (msg) => {
		msg.channel.send('Ping?')
			.then(m => m.edit(`Pong! Latency is ${m.createdTimestamp - msg.createdTimestamp}ms. API Latency is ${Math.round(m.client.ping)}ms`));
	}
};
