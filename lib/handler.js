/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 */
(function(module) {
    'use strict';

    function Handler() {
        this.storage = {};
    }

    /**
     * Initializes a new structure.
     * Before you can call {@link addField} with a structure it must be initialized.
     *
     * @param {string} id
     */
    Handler.prototype.addStructure = function(id) {
        this.storage[id] = {
            fields: {},
            relations: []
        };
    };

    /**
     * Add a field to the given structure.
     *
     * @param {string} id
     * @param {Field} field
     */
    Handler.prototype.addField = function(id, field) {
        this.storage[id].fields[field.name] = field;
    };

    /**
     * Creates a relation between two structures.
     * The source structure must be initialized.
     *
     * @param {string} sourceId
     * @param {string} relationId
     */
    Handler.prototype.addRelation = function(sourceId, relationId) {
        this.storage[sourceId].relations.push(relationId);
    };

    Handler.prototype.debug = function() {
        console.log('Print storage');
        console.dir(this.storage);
    };

    // Propagate Handler class
    module.exports = {
        Handler: Handler
    };
})(module);