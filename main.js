#!/usr/bin/env node

/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 */

var argv = require('optimist').argv,
    Conductor = require('./lib/conductor').Conductor,
    PhpDataobjectScaffolding = require('./lib/modules/phpDataobjectScaffolding/module').PhpDataobjectScaffolding;

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

var phpDoModule = new PhpDataobjectScaffolding();
conductor.on('end', function() {
    phpDoModule.process(conductor.handler.storage, function(err, outputs) {
        if(err) {
            console.error(err);
            return;
        }

        outputs.forEach(function(out) {
            if(out.state === 'fulfilled') {
                console.log(out.value);
            }
        });
    });
});

conductor.start();