#!/usr/bin/env node

/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 */

var argv = require('optimist').argv,
    Conductor = require('./lib/conductor').Conductor,
    Writer = require('./lib/writer').Writer;

var templateDir = argv.tplBaseDir,
    templateFile = argv.tplFile,
    patternDir = argv.patternDir;

var conductor = new Conductor({
    startDir: templateDir,
    startFile: templateFile,
    patternDir: patternDir
});

conductor.on('error', function(err) {
    console.error('Error', err);
});

conductor.on('end', function() {
    console.log('start model writing');
    var writer = new Writer();
    writer.write(conductor.handler.storage, function() {
        console.log('model written');
    });
});

console.log('start parsing project');
conductor.start();