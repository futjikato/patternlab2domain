#!/usr/bin/env node

/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 */

var argv = require('optimist').argv,
    Conductor = require('./lib/conductor').Conductor,
    PhpDataobjectScaffolding = require('./lib/modules/phpDataobjectScaffolding/module').PhpDataobjectScaffolding,
    Typo3NeosGenerator = require('./lib/modules/typo3NeosGenerator/module').Typo3NeosGenerator;

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

// var phpDoModule = new PhpDataobjectScaffolding();
var t3NeosModule = new Typo3NeosGenerator({options: {neos: {site: 'Futjikato.Test'}}}, './t3out');
conductor.on('end', function() {
    t3NeosModule.init().then(function() {
        t3NeosModule.process(conductor.handler.storage, function(err, outputs) {
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

    /*
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
    */
});

conductor.start();