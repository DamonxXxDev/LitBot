const fs = require('fs');
var addons = fs.readdirSync(__dirname + '/addons');
exports.commands = function() {
    return "Please specify the command as property.";
};
exports.functions = function() {
    return "Please specify the function as property.";
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
for (a = 0, le = addons.length; a < le; a++) {
    if (addons[a] === 'index.js' || !addons[a].endsWith('.js')) continue;
    var cmdFile = require('./addons/' + addons[a]);
    if (cmdFile.hasOwnProperty("commands")) {
        var cmdsInFileArr = Object.getOwnPropertyNames(cmdFile.commands);
        for (i = 0, len = cmdsInFileArr.length; i < len; i++) {
            if (exports.commands.hasOwnProperty(cmdFile.commands[cmdsInFileArr[i]])) {
                //doesnt work
                console.log("Duplicate command " + cmdFile.commands[cmdsInFileArr[i]] + " found.");
            } else {
                exports.commands[cmdsInFileArr[i]] = cmdFile.commands[cmdsInFileArr[i]];
            }
        }
    }
    //console.log(exports.commands);
    //not tested yet
    if (cmdFile.hasOwnProperty("functions")) {
        var fileFuncs = Object.getOwnPropertyNames(cmdFile.functions);
        for (var i = 0, len = fileFuncs.length; i < len; i++) {
            if (exports.functions.hasOwnProperty(cmdFile.functions[fileFuncs[i]])) {
                console.log("Duplicate function " + cmdFile.functions[fileFuncs[i]] + " found.");
            } else {
                exports.functions[fileFuncs[i]] = cmdFile.functions[fileFuncs[i]];
            }
        }
    }
}
