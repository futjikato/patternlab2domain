/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace Conductor
 */
(function(module) {
    'use strict';

    var extend = require('extend'),
        /**
         * @type {Parser.Parser}
         */
        Parser = require('./parser').Parser,
        /**
         * @type {Builder.NodeStorage}
         */
        NodeStorage = require('./builder').NodeStorage,
        /**
         * @type {Builder.CrNode}
         */
        CrNode = require('./builder').CrNode,
        util = require('util'),
        events = require('events'),
        fs = require('fs'),
        path = require('path'),
        Q = require('q');


    /**
     * Default options object.
     *
     * @memberOf Conductor
     * @namespace Conductor.defaultOptions
     *
     * @type {{}}
     */
    var defaultOptions = {

        /**
         * If you specify a file to start with only that one file is parsed.
         * As an alternative you can provide a {@link defaultOptions.startDir}.
         * If both options are given this option is ignored.
         *
         * @memberOf Conductor.defaultOptions
         *
         * @type {string}
         */
        startFile       : '',

        /**
         * If you specify a directory to parse completely all *.mustache files in the
         * given directory will be parsed.
         * As an alternative you can provide just a {@link defaultOptions.startFile} if
         * you only want to parse one file.
         * If both options are given this one is preferred.
         *
         * @memberOf Conductor.defaultOptions
         *
         * @type {string}
         */
        startDir        : '',

        /**
         * Path to the _pattern directory of patternlab.
         * Mandatory option!
         *
         * @memberOf Conductor.defaultOptions
         *
         * @type {string}
         */
        patternDir      : '',

        /**
         * File ending to parse in the {@link defaultOptions.startDir}.
         * This option is unused if you not use {@link defaultOptions.startDir}.
         *
         * @memberOf Conductor.defaultOptions
         *
         * @type {string}
         */
        fileEnding      : '.mustache'
    };

    /**
     * Parsing conductor.
     * Given a start file the conductor will manage a hierarchical parsing process to identify all organisms, molecules
     * and atoms used in the template.
     * All options are described in the {@link Conductor.defaultOptions defaultOptions}.
     *
     * @fires Conductor#error
     * @fires Conductor#end
     *
     * @memberOf Conductor
     * @namespace Conductor.Conductor
     *
     * @constructor
     * @param {{}} options
     */
    function Conductor(options) {
        events.EventEmitter.call(this);

        /**
         * Merged options
         *
         * @name options
         * @memberOf Conductor.Conductor
         *
         * @type {Conductor.defaultOptions}
         */
        this.options = extend(true, {}, defaultOptions, options);

        /**
         * List with all modules
         *
         * @name molecules
         * @memberOf Conductor.Conductor
         *
         * @type {{}}
         */
        this.molecules  = {};

        /**
         * List of all atoms
         *
         * @name atoms
         * @memberOf Conductor.Conductor
         *
         * @type {{}}
         */
        this.atoms      = {};

        /**
         * List of organisms
         *
         * @name organisms
         * @memberOf Conductor.Conductor
         *
         * @type {{}}
         */
        this.organisms  = {};

        /**
         * Data handler instance to handle fields.
         *
         * @name handler
         * @memberOf Conductor.Conductor
         *
         * @type {Builder.NodeStorage}
         */
        this.handler = new NodeStorage();

        /**
         * List with all parser promises.
         *
         * @name parserPromises
         * @memberOf Conductor.Conductor
         *
         * @type {Array}
         */
        this.parserPromises = [];

        /**
         * Unix timestamp set by {@link waitForFinish} to check for changes on the {@link parserPromises} array.
         *
         * @name parserPromisesTs
         * @memberOf Conductor.Conductor
         *
         * @type {Number}
         */
        this.parserPromisesTs;

        /**
         * Start a parser.
         * Handle all parser events.
         *
         * @function startParser
         * @memberOf Conductor.Conductor
         *
         * @private
         * @param {string} id
         * @param {Parser.Parser} parser
         */
        this.startParser = function(id, parser) {
            var $this = this,
                deffered = Q.defer();

            $this.parserPromises.push(deffered.promise);

            $this.handler.addNode(new CrNode(id));

            parser.on('error', function() {
                deffered.reject(new Error('Parser ' + id + ' failed.'));
            });

            parser.on('include', function(include) {
                $this.handler.addRelation(id, include);

                if(!$this.handler.hasNode(include.name)) {
                    var fileName = $this.getFilePathFromName(include.name);
                    $this.startParser(include.name, new Parser(fileName));

                    $this.waitForFinish();
                }
            });

            parser.on('field', function(field) {
                $this.handler.addField(id, field);
            });

            parser.on('end', function() {
                deffered.resolve();
            });

            parser.parse();
        };

        /**
         * Get the full file path for a structure id.
         * structure id's must start either with "molecules-", "organisms-" or "atoms-".
         *
         * @memberOf Conductor.Conductor
         * @function getFilePathFromName
         *
         * @private
         * @param {string} id
         *
         * @returns {string} absolute file path
         */
        this.getFilePathFromName = function(id) {
            switch(true) {
                case (id.substr(0, 'molecules-'.length) === 'molecules-'):
                    if(this.molecules[id]) {
                        return this.molecules[id];
                    }
                    break;

                case (id.substr(0, 'organisms-'.length) === 'organisms-'):
                    if(this.organisms[id]) {
                        return this.organisms[id];
                    }
                    break;

                case (id.substr(0, 'atoms-'.length) === 'atoms-'):
                    if(this.atoms[id]) {
                        return this.atoms[id];
                    }
                    break;
            }

            return null;
        };

        /**
         * Get the id name for a structure.
         *
         * @memberOf Conductor.Conductor
         * @function getNameFromFilePath
         * @private
         *
         * @param {string} structureType
         * @param {string} filePath
         *
         * @returns {string} name
         */
        this.getNameFromFilePath = function(structureType, filePath) {
            var regexEnding = this.options.fileEnding.replace('.', '\\.'),
                regex = new RegExp('([0-9]+)-(.*?)' + regexEnding),
                parts = regex.exec(filePath);

            if(!parts || parts.length < 2) {
                return null;
            }

            return structureType + "-" + parts[2];
        };

        /**
         * Build the atom, organism and molecule mapping.
         *
         * @function recursiveBuildStructureMapping
         * @memberOf Conductor.Conductor
         * @private
         *
         * @param {string} structureType
         * @param {string} base
         */
        this.recursiveBuildStructureMapping = function(structureType, base) {
            var $this = this,
                deferred = Q.defer();

            fs.readdir(base, function(err, files) {
                if(err) {
                    deferred.reject(err);
                    return;
                }

                var qList = [];
                files.forEach(function(filename) {
                    // in general skip dot-files
                    if(filename.substr(0, 1) === '.') {
                        return;
                    }

                    var innerDeferred = Q.defer();
                    qList.push(innerDeferred);

                    // add file or descent
                    var newPath = path.join(base, filename);
                    fs.stat(newPath, function(err, stats) {
                        if(stats.isFile()) {
                            if(filename.indexOf($this.options.fileEnding) != -1) {
                                var idName = $this.getNameFromFilePath(structureType, filename);
                                if(idName !== null) {
                                    $this[structureType][idName] = newPath;
                                }
                            }
                        } else if(stats.isDirectory()) {
                            $this.recursiveBuildStructureMapping(structureType, newPath).then(function() {
                                innerDeferred.resolve();
                            }, function(err) {
                                innerDeferred.reject(err);
                            });
                        }
                    });
                });

                var promises = Q.all(qList);
                Q.allSettled(promises).then(function() {
                    deferred.resolve();
                }, function(err) {
                    deferred.reject(err);
                });
            });

            return deferred.promise;
        };

        /**
         * Must be called after the {@link Conductor.Conductor.parserPromises parserPromises} array is changed.
         * This function will trigger the `end` event exactly one time.
         *
         * @function waitForFinish
         * @memberOf Conductor.Conductor
         * @private
         */
        this.waitForFinish = function() {
            var $this = this,
                lTs = Date.now(),
                additionalSeed = Math.random() * 10000;

            // this function can be called multiple times in 1 ms so wee need to add more entropy
            lTs = lTs + "" + additionalSeed;
            $this.parserPromisesTs = lTs;

            // wait for all parsers to finish
            var parserPromiseList = Q.all($this.parserPromises);
            Q.allSettled(parserPromiseList).then(function() {
                if($this.parserPromisesTs === lTs) {
                    $this.emit('end');
                }
            }, function(err) {
                $this.emit('error', err);
            });
        }
    }
    util.inherits(Conductor, events.EventEmitter);

    /**
     * Start the hierarchical parsing process.
     *
     * @function start
     * @memberOf Conductor.Conductor
     */
    Conductor.prototype.start = function() {
        var $this = this;

        // build file mappings
        var inits = [];
        inits.push($this.recursiveBuildStructureMapping('atoms', path.join($this.options.patternDir, '00-atoms')));
        inits.push($this.recursiveBuildStructureMapping('organisms', path.join($this.options.patternDir, '02-organisms')));
        inits.push($this.recursiveBuildStructureMapping('molecules', path.join($this.options.patternDir, '01-molecules')));

        // start initial parsers
        var promises = Q.all(inits);
        Q.allSettled(promises).then(function() {
            // process start point(s)
            if($this.options.startDir && $this.options.startDir.length > 0) {
                fs.readdir($this.options.startDir, function(err, files) {
                    if(err) {
                        $this.emit('error', err);
                        return;
                    }

                    files.forEach(function(filename) {
                        if(filename.indexOf($this.options.fileEnding) != -1) {
                            var tplParser = new Parser(path.join($this.options.startDir, filename));
                            $this.startParser(filename, tplParser);
                        }
                    });

                    $this.waitForFinish();
                });
            } else if($this.options.startFile && $this.options.startFile.length > 0) {
                var tplParser = new Parser($this.options.startFile);
                $this.startParser($this.options.startFile, tplParser);
                $this.waitForFinish();
            } else {
                $this.emit('error', new Error('Neither startFile nor startDir given.'));
            }
        }, function(err) {
            $this.emit('error', err);
        });
    };

    // Propagate conductor class
    module.exports = {
        Conductor: Conductor
    };
})(module);