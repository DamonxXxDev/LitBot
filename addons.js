const fs = require('fs');
exports.commands = function() {
	return 'Please specify the command as property.';
};
exports.functions = function() {
	return 'Please specify the function as property.';
};
function getCmdsFromFile(path){
	try{
		//'./addons/' + addons[a]
	var cmdFile = require(path);
	if (cmdFile.hasOwnProperty('commands')) {
		var cmdsInFileArr = Object.getOwnPropertyNames(cmdFile.commands);
		for (i = 0, len = cmdsInFileArr.length; i < len; i++) {
			if (exports.commands.hasOwnProperty(cmdFile.commands[cmdsInFileArr[i]])) {
				//doesnt work
				console.log('Duplicate command ' + cmdFile.commands[cmdsInFileArr[i]] + ' found.');
			} else {
				exports.commands[cmdsInFileArr[i]] = cmdFile.commands[cmdsInFileArr[i]];
			}
		}
	}
	if (cmdFile.hasOwnProperty('functions')) {
		var fileFuncs = Object.getOwnPropertyNames(cmdFile.functions);
		for (var i = 0, len = fileFuncs.length; i < len; i++) {
			if (exports.functions.hasOwnProperty(cmdFile.functions[fileFuncs[i]])) {
				console.log('Duplicate function ' + cmdFile.functions[fileFuncs[i]] + ' found.');
			} else {
				exports.functions[fileFuncs[i]] = cmdFile.functions[fileFuncs[i]];
			}
		}
	}
	}
	catch(err){
		console.error("Error getting addons from files. You probably have a invalid addon.");
		throw err;
	}
}
checkFiles(__dirname.replace(/\\/g, "/") + '/addons');
function checkFiles(dir){
	var addons;
	try{
		addons = fs.readdirSync(dir);
	}
	catch(err){
		console.log("Error reading addons directory: ");
		throw err;
	}
	for (var a = 0, le = addons.length; a < le; a++) {
		if(fs.statSync(dir + '/' + addons[a]).isDirectory()){
			checkFiles(dir + '/' + addons[a]);
			continue;
		}else if (addons[a] === 'index.js' || !addons[a].endsWith('.js')) {
			continue;
		}else{
			getCmdsFromFile(dir + '/' + addons[a]);
		}
	}
}
