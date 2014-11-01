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
     * Returns true if the field was used as a iterable object.
     * e.g. in a for-loop.
     *
     * @function isIterable
     * @memberOf Parser.Field
     *
     * @returns {boolean}
     */
    Field.prototype.isIterable = function() {
        return this.options.iterable;
    };


    /**
     * Mustache includes are translated to relations between nodes.
     * This is a pure data object containing some information about the include.
     *
     * @memberOf Parser
     * @namespace Parser.Include
     *
     * @constructor
     * @param {string} name
     * @param {InfoBlock} info
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
         * @type {Parser.InfoBlock}
         */
        this.info = info;
    }

    /**
     * Default options for an information block
     *
     * @memberOf Parser
     * @namespace Parser.parserInfoDefaultOptions
     *
     * @type {{}}
     */
    var parserInfoDefaultOptions = {

        /**
         * Variable name.
         * used for information blocks with type 'import' to specify the relation name in the CR context.
         *
         * @memberOf Parser.parserInfoDefaultOptions
         *
         * @type {string}
         */
        name: ''
    };

    /**
     * Information extracted from a comment block in the parsing template.
     * This information can be used on following tags to enrich them with some more data.
     *
     * @memberOf Parser
     * @namespace Parser.InfoBlock
     *
     * @constructor
     * @param {string} type
     * @param {{}} options
     */
    function InfoBlock(type, options) {
        /**
         * Type of the information.
         * Can be one of the following strings:
         * 'import'
         *
         * @name type
         * @memberOf Parser.InfoBlock
         *
         * @type {string}
         */
        this.type = type;

        /**
         * Options contain the real information provided by this block.
         *
         * @name options
         * @memberOf Parser.InfoBlock
         *
         * @type {Parser.parserInfoDefaultOptions}
         */
        this.options = extend(true, {}, parserInfoDefaultOptions, options);
    }

    /**
     * Parser class
     *
     * @fires Parser#error
     * @fires Parser#include
     * @fires Parser#field
     * @fires Parser#end
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

        /**
         * Parse an comment block and return an info block if it matches teh definition of one
         *
         * @function readCrComment
         * @memberOf Parser.Parser
         * @private
         *
         * @param {string} value
         *
         * @returns {Parser.InfoBlock}
         */
        this.readCrComment = function(value) {
            switch(true) {
                case (value.substr(0, 'cr:import'.length) === 'cr:import'):
                    var opts = {
                        name: value.substr('cr:import'.length + 1)
                    };
                    return new InfoBlock('import', opts);
                    break;
            }

            return null;
        };
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
                         * Comments may contain additional information for imports
                         */
                        case '!':
                            var infoBlock = $this.readCrComment(b[1]);
                            if(infoBlock) {
                                lastInfo = infoBlock;
                            }
                            break;

                        /**
                         * Handle imports
                         */
                        case '>':
                            // provide basic fallback
                            if(lastInfo === null) {
                                lastInfo = new InfoBlock('import', {
                                    name: b[1]
                                });
                            }
                            $this.emit('include', new Include(b[1], lastInfo));
                            lastInfo = null;
                            break;

                        /**
                         * Handle for-loops
                         */
                        case '#':
                            var field = new Field(b[1], {
                                iterable: true
                            });
                            $this.emit('field', field);
                            // reset info - must be directly above include !
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