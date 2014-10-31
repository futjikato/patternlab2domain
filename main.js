#!/usr/bin/env node

var argv = require('optimist').argv,
    Conductor = require('./lib/conductor').Conductor;

var templateDir = argv.tplBaseDir,
    templateFile = argv.tplFile,
    patternDir = argv.patternDir;

var conductor = new Conductor({
    startDir: templateDir,
    startFile: templateFile,
    patternDir: patternDir
});

conductor.on('error', function(err) {
    console.error(err);
});

conductor.on('end', function() {
    conductor.handler.debug();
});

conductor.start();