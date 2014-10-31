/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
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
     * @type {{}}
     */
    var parserFieldDefaultOptions = {

        /**
         * Flag if the field is iterable
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
     * @constructor
     * @param {string} name
     * @param {{}} options
     */
    function Field(name, options) {

        /**
         * name of the field
         *
         * @type {string}
         */
        this.name = name;

        /**
         * additional options of the field.
         * See {@link parserFieldDefaultOptions} for more information.
         *
         * @type {parserFieldDefaultOptions}
         */
        this.options = extend(true, {}, parserFieldDefaultOptions, options);
    }

    /**
     * Returns true if the field was used as a iterable object.
     * e.g. in a for-loop.
     *
     * @returns {boolean}
     */
    Field.prototype.isIterable = function() {
        return this.options.iterable;
    };

    /**
     * Parser class
     *
     * @fires Parser#error
     * @fires Parser#include
     * @fires Parser#field
     * @fires Parser#end
     *
     * @constructor
     * @param {string} file
     */
    function Parser(file) {
        events.EventEmitter.call(this);

        /**
         * File path to parse
         *
         * @type {string}
         */
        this.file = file;
    }
    util.inherits(Parser, events.EventEmitter);

    /**
     * Main parsing method.
     * Uses mustache to do the basic parsing. Then walk through the tokens and handle imports and all that.
     */
    Parser.prototype.parse = function() {
        var $this = this;
        fs.readFile(this.file, function(err, content) {
            if(err) {
                $this.emit('error', err);
                return;
            }

            var parsed = Mustache.parse(content.toString());
            parsed.forEach(function(b) {
                if(b && b.length > 0) {
                    switch(b[0]) {

                        /**
                         * Handle imports
                         */
                        case '>':
                            $this.emit('include', b[1]);
                            break;

                        /**
                         * Handle for-loops
                         */
                        case '#':
                            var field = new Field(b[1], {
                                iterable: true
                            });
                            $this.emit('field', field);
                            break;

                    }
                }
            });

            $this.emit('end');
        });
    };

    module.exports = {
        Parser: Parser
    };
})(module);