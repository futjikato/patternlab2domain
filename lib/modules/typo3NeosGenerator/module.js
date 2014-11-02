/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace BuilderModules.typo3NeosGenerator
 */
(function(module) {

    var util = require('util'),
        BuilderModule = require('./../../builder').BuilderModule,
        Q = require('q'),
        fs = require('fs'),
        Mustache = require('mustache'),
        path = require('path');

    /**
     * @memberOf BuilderModules.typo3NeosGenerator
     * @namespace BuilderModules.Typo3NeosGenerator.Typo3NeosGenerator
     * @constructor
     */
    function Typo3NeosGenerator(moduleOptions, outputDir) {
        BuilderModule.call(this);

        this.nodeConfigurationTemplateFile = './lib/modules/typo3NeosGenerator/nodeConfiguration.yaml.mustache';

        this.nodeConfigurationTemplate = null;

        this.createNodeConfiguration = function(crNode) {
            var deferred = Q.defer(),
                $this = this;

            if($this.nodeConfigurationTemplate === null) {
                deferred.reject();
            } else {
                var configYaml = Mustache.render($this.nodeConfigurationTemplate , {
                    module: moduleOptions,
                    node: crNode
                });

                fs.writeFile(path.join(outputDir, crNode.id + '.yaml'), configYaml, function(err) {
                    if(err) {
                        deferred.reject();
                    } else {
                        deferred.resolve();
                    }
                });
            }

            return deferred.promise;
        };

        this.typoscriptTemplate = null;

        this.typoscriptTemplateFile = './lib/modules/typo3NeosGenerator/nodeTyposcript.ts2.mustache';

        this.createTyposcript = function(crNode) {
            var deferred = Q.defer(),
                $this = this;

            if($this.typoscriptTemplate === null) {
                deferred.reject();
            } else {
                var configTs2 = Mustache.render($this.typoscriptTemplate , {
                    module: moduleOptions,
                    node: crNode
                });

                fs.writeFile(path.join(outputDir, crNode.id + '.ts2'), configTs2, function(err) {
                    if(err) {
                        deferred.reject();
                    } else {
                        deferred.resolve();
                    }
                });
            }

            return deferred.promise;
        };

        this.createTemplate = function(crNode) {
            var deferred = Q.defer();
            deferred.resolve();
            return deferred.promise;
        };
    }
    util.inherits(Typo3NeosGenerator, BuilderModule);

    /**
     * Initialize templates
     *
     * @function init
     * @memberOf BuilderModules.Typo3NeosGenerator.Typo3NeosGenerator
     *
     * @returns {promise|Q.promise}
     */
    Typo3NeosGenerator.prototype.init = function() {
        var $this = this;

        var configDeferred = Q.defer();
        fs.readFile($this.nodeConfigurationTemplateFile, function(err, fileContent) {
            if(err) {
                configDeferred.reject(err);
            } else {
                $this.nodeConfigurationTemplate = fileContent.toString();
                Mustache.parse($this.nodeConfigurationTemplate);
                configDeferred.resolve();
            }
        });

        var typoScriptDeffered = Q.defer();
        fs.readFile($this.typoscriptTemplateFile, function(err, fileContent) {
            if(err) {
                typoScriptDeffered.reject(err);
            } else {
                $this.typoscriptTemplate = fileContent.toString();
                Mustache.parse($this.typoscriptTemplate);
                typoScriptDeffered.resolve();
            }
        });

        return Q.all([
            configDeferred.promise,
            typoScriptDeffered.promise
        ]);
    };

    /**
     * Create a dataobject for the given node.
     *
     * @function createNode
     * @memberOf BuilderModules.Typo3NeosGenerator.Typo3NeosGenerator
     *
     * @param {Builder.CrNode} crNode node to create
     *
     * @returns {Q.Promise}
     */
    Typo3NeosGenerator.prototype.createNode = function(crNode) {
        var deferred = Q.defer();

        // inject some information into element node
        crNode.info.options.neos = {
            parentType: 'TYPO3.Neos:Content'
        };

        if(crNode.info.options.hasOwnProperty('isOwnElement') && crNode.info.options.isOwnElement === false ) {
            deferred.reject();
        } else {
            var qList = [];
            qList.push(this.createNodeConfiguration(crNode));
            qList.push(this.createTyposcript(crNode));
            qList.push(this.createTemplate(crNode));

            Q.allSettled(qList).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    };

    module.exports = {
        Typo3NeosGenerator: Typo3NeosGenerator
    };
})(module);