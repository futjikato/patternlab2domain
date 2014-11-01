/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace BuilderModules.PhpDataobjectScaffolding
 */
(function() {

    var util = require('util'),
        BuilderModule = require('./../../builder').BuilderModule,
        fs = require('fs'),
        Mustache = require('mustache'),
        Q = require('q');

    /**
     * @memberOf BuilderModules.PhpDataobjectScaffolding
     * @namespace BuilderModules.PhpDataobjectScaffolding
     * @constructor
     */
    function PhpDataobjectScaffolding() {
        BuilderModule.call(this);

        /**
         * Path to template file for php data object
         *
         * @name templateFile
         * @memberOf BuilderModules.PhpDataobjectScaffolding
         *
         * @type {string}
         */
        this.templateFile = './lib/modules/phpDataobjectScaffolding/template.php.mustache';
    }
    util.inherits(PhpDataobjectScaffolding, BuilderModule);

    /**
     * Create a dataobject for the given node.
     *
     * @function createNode
     * @memberOf BuilderModules.PhpDataobjectScaffolding
     *
     * @param {Builder.CrNode} crNode node to create
     *
     * @returns {Q.Promise}
     */
    PhpDataobjectScaffolding.prototype.createNode = function(crNode) {
        var deferred = Q.defer();

        fs.readFile(this.templateFile, function(err, content) {
            if(err) {
                deferred.reject(err);
                return;
            }

            var output = Mustache.render(content.toString(), {
                node: crNode,
                fieldArray: function() {
                    var fieldArray = [];
                    for(var prop in this.node.fields) {
                        if(this.node.fields.hasOwnProperty(prop)) {
                            fieldArray.push(this.node.fields[prop]);
                        }
                    }
                    return fieldArray;
                },
                className: function() {
                    return function(val, render) {
                        var pVal = render(val);
                        pVal = pVal.replace(/(\-|\.)/g, "_");
                        pVal = pVal.charAt(0).toUpperCase() + pVal.slice(1);
                        return pVal;
                    }
                },
                propertyName: function() {
                    return function(val, render) {
                        var pVal = render(val);
                        pVal = pVal.replace(/(\-|\.)/g, "_");
                        return pVal;
                    }
                }
            });

            deferred.resolve(output);
        });

        return deferred.promise;
    };

    module.exports = {
        PhpDataobjectScaffolding: PhpDataobjectScaffolding
    };
})(module);