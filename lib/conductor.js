/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 */
(function(module) {
    'use strict';

    var extend = require('extend'),
        Parser = require('./parser').Parser,
        Handler = require('./handler').Handler,
        util = require('util'),
        events = require('events'),
        fs = require('fs'),
        path = require('path'),
        Q = require('q');


    /**
     * Default options object.
     *
     * @type {{}}
     */
    var defaultOptions = {

        /**
         * If you specify a file to start with only that one file is parsed.
         * As an alternative you can provide a {@link defaultOptions.startDir}.
         * If both options are given this option is ignored.
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
         * @type {string}
         */
        startDir        : '',

        /**
         * Path to the _pattern directory of patternlab.
         * Mandatory option!
         *
         * @type {string}
         */
        patternDir      : '',

        /**
         * File ending to parse in the {@link defaultOptions.startDir}.
         * This option is unused if you not use {@link defaultOptions.startDir}.
         *
         * @type {string}
         */
        fileEnding      : '.mustache'
    };

    /**
     * Parsing conductor.
     * Given a start file the conductor will manage a hierarchical parsing process to identify all organisms, molecules
     * and atoms used in the template.
     * All options are described in the {@link defaultOptions}.
     *
     * @fires Conductor#error
     *
     * @constructor
     * @param {{}} options
     */
    function Conductor(options) {
        events.EventEmitter.call(this);

        /**
         * Merged options
         *
         * @type {defaultOptions}
         */
        this.options = extend(true, {}, defaultOptions, options);

        /**
         * List with all modules
         *
         * @type {{}}
         */
        this.molecules  = {};

        /**
         * List of all atoms
         *
         * @type {{}}
         */
        this.atoms      = {};

        /**
         * List of organisms
         *
         * @type {{}}
         */
        this.organisms  = {};

        /**
         * Data handler instance to handle fields.
         *
         * @type {Handler}
         */
        this.handler = new Handler();

        /**
         * Start a parser.
         * Handle all parser events.
         *
         * @private
         * @param {string} id
         * @param {Parser} parser
         */
        this.startParser = function(id, parser) {
            var $this = this;

            $this.handler.addStructure(id);

            parser.on('error', function() {
                $this.emit('error', 'Parser ' + id + ' failed.');
            });

            parser.on('include', function(name) {
                $this.handler.addRelation(id, name);

                var fileName = $this.getFilePathFromName(name);
                $this.startParser(name, new Parser(fileName));
            });

            parser.on('field', function(field) {
                $this.handler.addField(id, field);
            });

            parser.on('end', function() {
                console.log('parser ended');
                console.log($this.handler.storage);
            });

            parser.parse();
        };

        /**
         * Get the full file path for a structure id.
         * structure id's must start either with "molecules-", "organisms-" or "atoms-".
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
         * @param {string} structureType
         * @param {string} base
         */
        this.recursiveBuildStructureMapping = function(structureType, base) {
            var $this = this,
                deferred = Q.defer();

            fs.readdir(base, function(err, files) {
                if(err) {
                    console.error(err);
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
    }
    util.inherits(Conductor, events.EventEmitter);

    /**
     * Start the hierarchical parsing process.
     */
    Conductor.prototype.start = function() {
        var $this = this;

        // build file mappings
        var inits = [];
        inits.push($this.recursiveBuildStructureMapping('atoms', path.join($this.options.patternDir, '00-atoms')));
        inits.push($this.recursiveBuildStructureMapping('organisms', path.join($this.options.patternDir, '02-organisms')));
        inits.push($this.recursiveBuildStructureMapping('molecules', path.join($this.options.patternDir, '01-molecules')));

        var promises = Q.all(inits);
        Q.allSettled(promises).then(function() {
            console.log($this);

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
                });
            } else if($this.options.startFile && $this.options.startFile.length > 0) {
                var tplParser = new Parser($this.options.startFile);
                $this.startParser($this.options.startFile, tplParser);
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