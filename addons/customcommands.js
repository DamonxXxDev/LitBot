exports.commands = new Object();
var customcmds = {};
//test if works
const fs = require('fs');
var addons = require('../addons.js');
exports.commands = {
	addcommand: {
		usage: '<"command"> <"response">',
		description: 'Creates a custom command.',
		aliases: ['ac', 'createcommand'],
		command: (msg, tokens) => {
			if (addons.functions.hasRole(msg, tokens) == false) return;
			exports.functions.getCustomCmds(msg)
				.then((value) => {
					let args = msg.content.toLowerCase().split('"');
					if (args[1] == undefined) {
						msg.channel.send('Invalid command. Send ' + tokens.prefix + 'help for help.');
						return;
					}
					if (args[3] == undefined) {
						msg.channel.send('Invalid response. Send ' + tokens.prefix + 'help for help.');
						return;
					}
					var command = args[1];
					var response = args[3];
					msg.channel.send('Are you sure you want to add this command: **' + command + '** with response: **' + response + '**. Reply yes/no.');
					let collector = msg.channel.createMessageCollector(m => m);
					collector.on('collect', m => {
						if (m.content == 'yes' && m.author.id == msg.author.id) {
							console.log('Added command: ' + command + ' with response: ' + response + ' by: ' + msg.author.username + '#' + msg.author.discriminator + ' in guild: ' + msg.guild.name);
							customcmds[msg.guild.id].cmds.push({
								command: command,
								response: response,
								creator: msg.author.username + '#' + msg.author.discriminator
							});
							msg.channel.send('Added command: **' + args[1] + '** with response: **' + args[3] + '** by: **' + msg.author.username + '#' + msg.author.discriminator + '**');
							fs.writeFile('./.data/cmds_' + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds, null, '\t'), 'utf8', (err) => {
								if (err) console.log('Error saving command to file: ' + err);
							});
							collector.stop();
						} else if (m.content == 'no' && m.author.id == msg.author.id) {
							msg.channel.send('Canceled creating command.');
							collector.stop();
						}
					});
				}, (reason) => {
					throw reason;
				});

		}
	},
	removecommand: {
		usage: '"<command>"',
		description: 'Removes a custom command.',
		aliases: ['rc', 'removecmd'],
		command: (msg, tokens) => {
			if (addons.functions.hasRole(msg, tokens) == false) {
				msg.channel.send('Couldn\'t execute command, because you don\'t have the Bot Controller role.');
				return;
			}
			exports.functions.getCustomCmds(msg)
				.then((value) => {
					var splitcommand = msg.content.split('"')[1];
					var removed = false;
					for (var i = 0; i < customcmds[msg.guild.id].cmds.length; i++) {
						if (customcmds[msg.guild.id].cmds[i].command == splitcommand) {
							removed = true;
							msg.channel.send('Removed command: **' + customcmds[msg.guild.id].cmds[i].command + '** with response: **' + customcmds[msg.guild.id].cmds[i].response + '** created by: **' + customcmds[msg.guild.id].cmds[i].creator + '**');
							console.log('Removed command: ' + customcmds[msg.guild.id].cmds[i].command + ' with response: ' + customcmds[msg.guild.id].cmds[i].response + ' created by: ' + customcmds[msg.guild.id].cmds[i].creator + ' in guild: ' + msg.guild.name + ' with ID ' + msg.guild.id);
							customcmds[msg.guild.id].cmds.splice(i, 1);
							fs.writeFile('./.data/cmds_' + msg.guild.id + '.json', JSON.stringify(customcmds[msg.guild.id].cmds, null, '\t'), 'utf8', (err) => {
								if (err) console.log('Error saving commands to file: ' + err);
							});
							break;
						} else if (i >= customcmds[msg.guild.id].cmds.length && removed == false) {
							//doesn't work
							msg.channel.send('This guild doesn\'t have a custom command named ' + splitcommand + '.');
							return;
						}
					}
				}, (reason) => {
					throw reason;
				});
		}
	},
	customcommands: {
		usage: '',
		description: 'Lists all custom commands.',
		aliases: ['cmds', 'cc'],
		command: (msg, tokens) => {
			exports.functions.getCustomCmds(msg)
				.then((value) => {
					if (customcmds[msg.guild.id].cmds.length == 0) return msg.channel.send(`Add some custom commands first with ${tokens.prefix}addcommand`);
					let tosend = [];
					customcmds[msg.guild.id].cmds.forEach((cmd, i) => {
						tosend.push(`${i + 1}. Command: ${cmd.command} Response: ${cmd.response} - Created by: ${cmd.creator}`);
					});
					msg.channel.send(`${msg.guild.name}'s Custom Commands: \n\`\`\`${tosend.slice(0, 15).join('\n')}\`\`\``);
				}, (reason) => {
					throw reason;
				});
		}
	}
}
exports.functions = {
	getCustomCmds: (msg) => {
		return new Promise(function (resolve, reject) {
			if (typeof customcmds[msg.guild.id] == "undefined") customcmds[msg.guild.id] = {};
			if (typeof customcmds[msg.guild.id].cmds == 'undefined') {
				(function getFile() {
					fs.stat('./.data/', (err, stat) => {
						if (err) {
							if (err.code == "ENOENT") {
								//.data doesn't exist
								fs.mkdir('./.data/', (err) => {
									if (err) {
										reject(Error("Error creating .data folder: " + err));
									} else {
										getFile();
										return;
									}
								});

							}
						} else {
							fs.readFile('./.data/cmds_' + msg.guild.id + '.json', (err, data) => {
								if (err) {
									if (err.code == 'ENOENT') {
										fs.writeFile('./.data/cmds_' + msg.guild.id + '.json', "[]", (err) => {
											if (err) {
												reject(Error("Error saving admin role."));
											} else {
												getFile();
												return;
											}
										})
									}
								} else {
									customcmds[msg.guild.id].cmds = JSON.parse(data);
									resolve({ msg: "Got commands from file.", cmds: customcmds[msg.guild.id].cmds });
								}
							})
						}
					});
				})();
			} else {
				resolve({ msg: "Commands already loaded.", cmds: customcmds[msg.guild.id].cmds });
			}
		})
	},
	checkCmd: (msg) => {
		exports.functions.getCustomCmds(msg)
			.then(function (result, err) {
				if (!err) {
					var obj = customcmds[msg.guild.id].cmds.find(o => o.command === msg.content.toLowerCase());
					if (obj) {
						msg.channel.send(obj.response);
						return obj.response;
					}
				} else {
					throw err;
				}
			})

	}
};
