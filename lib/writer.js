/**
 * @module patternlab2domain
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace Writer
 */
(function(module) {
    'use strict';

    var extend = require('extend'),
        fs = require('fs');

    /**
     * Writer default options
     *
     * @memberOf Writer
     *
     * @type {{outFile: string, pretty: number}}
     */
    var writerDefaultOptions = {

        outFile: '/home/moritz/node/patternlab2phpcr/out/model.json',

        pretty: 4
    };

    /**
     * Writer class for creating the actual model json file.
     *
     * @memberOf Writer
     * @namespace Writer.Writer
     *
     * @param {{}} options
     * @constructor
     */
    function Writer(options) {

        /**
         * Writer options
         *
         * @memberOf Writer.Writer
         * @name options
         *
         * @type {{}}
         */
        this.options = extend({}, writerDefaultOptions, options);

        /**
         * Domain model
         *
         * @memberOf Writer.Writer
         * @name model
         *
         * @type {{}}
         */
        this.model = {
            elements: []
        };

        /**
         * Add a CrNode to the model.
         * Checks if the node is an element and not just a simple include.
         *
         * @memberOf Writer.Writer
         * @function addNodeToModel
         * @private
         *
         * @param {Builder.CrNode} crNode
         */
        this.addNodeToModel = function(crNode) {
            if(!crNode.info.hasOwnProperty('isOwnElement') || crNode.info.isOwnElement !== false) {
                this.model.elements.push(crNode);
            }
        }
    }

    /**
     * Convert the node storage to the domain model.
     * Then write the model to a file.
     *
     * @memberOf Writer.Writer
     * @function write
     *
     * @param {Builder.NodeStorage} storage
     * @param {function} fn
     */
    Writer.prototype.write = function(storage, fn) {
        if(typeof fn != 'function') {
            fn = function() {};
        }

        for(var i in storage) {
            if(storage.hasOwnProperty(i)) {
                this.addNodeToModel(storage[i]);
            }
        }

        try {
            var str = JSON.stringify(this.model, null, this.options.pretty);
            fs.writeFile(this.options.outFile, str, function(err) {
                fn(err);
            });
        } catch (e) {
            console.log(e);
        }
    };

    // expose writer as public API
    module.exports = {
        Writer: Writer
    };
})(module);