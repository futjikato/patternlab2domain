/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace Parser
 */
(function(module) {
    'use strict';

    var Mustache = require('mustache'),
        extend = require('extend'),
        fs = require('fs'),
        util = require('util'),
        events = require('events');

    /**
     * Default options for the {@link Field} class.
     *
     * @memberOf Parser
     * @namespace Parser.parserFieldDefaultOptions
     *
     * @type {{}}
     */
    var parserFieldDefaultOptions = {

        /**
         * Flag if the field is iterable
         *
         * @memberOf Parser.parserFieldDefaultOptions
         *
         * @type {boolean}
         */
        iterable: false
    };

    /**
     * Single parser field aka mustache variable.
     * This is a pure data object containing some information about the usage of the
     * mustache variable in the template.
     *
     * @memberOf Parser
     * @namespace Parser.Field
     *
     * @constructor
     * @param {string} name
     * @param {{}} options
     */
    function Field(name, options) {

        /**
         * name of the field
         *
         * @name name
         * @memberOf Parser.Field
         *
         * @type {string}
         */
        this.name = name;

        /**
         * additional options of the field.
         * See {@link parserFieldDefaultOptions} for more information.
         *
         * @name options
         * @memberOf Parser.Field
         *
         * @type {Parser.parserFieldDefaultOptions}
         */
        this.options = extend(true, {}, parserFieldDefaultOptions, options);
    }


    /**
     * Mustache includes are translated to relations between nodes.
     * This is a pure data object containing some information about the include.
     *
     * @memberOf Parser
     * @namespace Parser.Include
     *
     * @constructor
     * @param {string} name
     * @param {{}} info
     */
    function Include(name, info) {

        /**
         * name of the field
         *
         * @name name
         * @memberOf Parser.Include
         *
         * @type {string}
         */
        this.name = name;

        /**
         * Additional information provided by previous comment in template.
         *
         * @name info
         * @memberOf Parser.Include
         *
         * @type {{}}
         */
        this.options = info;
    }

    /**
     * Parser class
     *
     * @fires Parser#error
     * @fires Parser#include
     * @fires Parser#field
     * @fires Parser#end
     * @fires Parser#nodeinfo
     *
     * @memberOf Parser
     * @namespace Parser.Parser
     *
     * @constructor
     * @param {string} file Absolute file path to mustache template
     */
    function Parser(file) {
        events.EventEmitter.call(this);

        /**
         * File path to parse
         *
         * @name file
         * @memberOf Parser.Parser
         *
         * @type {string}
         */
        this.file = file;
    }
    util.inherits(Parser, events.EventEmitter);

    /**
     * Main parsing method.
     * Uses mustache to do the basic parsing. Then walk through the tokens and handle imports and all that.
     *
     * @function parse
     * @memberOf Parser.Parser
     */
    Parser.prototype.parse = function() {
        var $this = this;
        fs.readFile(this.file, function(err, content) {
            if(err) {
                $this.emit('error', err);
                return;
            }

            // parse template with mustache
            var parsed = Mustache.parse(content.toString()),
                lastInfo = null;

            // walk through all the tokens the mustache parser found
            parsed.forEach(function(b) {
                if(b && b.length > 0) {
                    switch(b[0]) {

                        /**
                         * Handle comments
                         * Comments may contain additional information for imports or the base node
                         */
                        case '!':
                            var value = b[1];
                            switch(true) {
                                case (value.substr(0, 'cr:element'.length) === 'cr:element'):
                                    lastInfo = JSON.parse(value.substr('cr:element'.length + 1));
                                    break;

                                case (value.substr(0, 'cr:node'.length) === 'cr:node'):
                                    var opts = JSON.parse(value.substr('cr:node'.length + 1));
                                    $this.emit('nodeinfo', opts);
                                    break;
                            }
                            break;

                        /**
                         * Handle imports
                         */
                        case '>':
                            // provide basic fallback
                            if(lastInfo === null) {
                                lastInfo = {
                                    name: b[1]
                                };
                            }
                            $this.emit('include', new Include(b[1], lastInfo));
                            lastInfo = null;
                            break;

                        /**
                         * Handle for-loops
                         */
                        case '#':
                            if(lastInfo === null) {
                                lastInfo = {};
                            }
                            var defaultOpts = {
                                iterable: true
                            };
                            var iteraField = new Field(b[1], extend(defaultOpts, lastInfo));
                            $this.emit('field', iteraField);
                            lastInfo = null;
                            break;

                        /**
                         * Handle normal variable fields
                         */
                        case 'name':
                            if(lastInfo === null) {
                                lastInfo =  {};
                            }
                            var field = new Field(b[1], extend({}, lastInfo));
                            $this.emit('field', field);
                            lastInfo = null;
                            break;

                    }
                }
            });

            $this.emit('end');
        });
    };

    module.exports = {
        Parser      : Parser,
        Field       : Field,
        Include     : Include
    };
})(module);