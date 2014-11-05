/**
 * @module patternlab2phpcr
 * @author Moritz Spindelhirn [m.spindelhirn@cashiers-check.de]
 * @namespace Builder
 */
(function(module) {
    'use strict';

    var Field = require('./parser').Field,
        Include = require('./parser').Include,
        Q = require('q');

    /**
     * Represents a node
     *
     * @memberOf Builder
     * @namespace Builder.CrNode
     * @constructor
     * @param {string} id
     */
    function CrNode(id) {

        /**
         * ID of the node.
         *
         * @name id
         * @memberOf Builder.CrNode
         *
         * @type {string}
         */
        this.id = id;

        /**
         * @name templateFile
         * @memberOf Builder.CrNode
         *
         * @type {string}
         */
        this.templateFile = null;

        /**
         * @name fields
         * @memberOf Builder.CrNode
         *
         * @type {Parser.Field[]}
         */
        this.fields = [];

        /**
         * @name relations
         * @memberOf Builder.CrNode
         *
         * @type {Parser.Include[]}
         */
        this.relations = [];

        /**
         * Additional information for this node
         *
         * @name info
         * @memberOf Builder.CrNode
         *
         * @type {Parser.InfoBlock}
         */
        this.info = null;
    }

    /**
     * Add a field to the node.
     *
     * @throws {TypeError} Throws an {@link TypeError} if the given field is not an instance of {@link Field}.
     * @throws {Error} Throws an {@link Error} when there is already a field with the same name attached to the node.
     *
     * @function addField
     * @memberOf Builder.CrNode
     *
     * @param {Field} field
     */
    CrNode.prototype.addField = function(field) {
        if(!(field instanceof Field)) {
            throw new TypeError('Fields must be instances of Field.');
        }

        this.fields.push(field);
    };

    /**
     * Add an include as a relation to the node.
     *
     * @param {Parser.Include} include
     */
    CrNode.prototype.addRelation = function(include) {
        if(!(include instanceof Include)) {
            throw new TypeError('Relation object must be instances of Include.');
        }

        this.relations.push(include);
    };


    /**
     * NodeStorage class for structures.
     *
     * @memberOf Builder
     * @namespace Builder.NodeStorage
     * @constructor
     */
    function NodeStorage() {

        /**
         * Map storage for nodes.
         *
         * @name storage
         * @memberOf Builder.NodeStorage
         *
         * @type {Object.<string, Builder.CrNode>}
         */
        this.storage = {};
    }

    /**
     * Initializes a new structure.
     * Before you can call {@link Builder.NodeStorage.addField addField} or {@link Builder.NodeStorage.addRelation addRelation} with
     * a {@link Builder.CrNode node} it must be initialized.
     *
     * @function addNode
     * @memberOf Builder.NodeStorage
     *
     * @param {Builder.CrNode} node Node to be initialized
     */
    NodeStorage.prototype.addNode = function(node) {
        this.storage[node.id] = node;
    };

    /**
     * Return true if the given node id is already known to the storage.
     *
     * @function hasNode
     * @memberOf Builder.NodeStorage
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    NodeStorage.prototype.hasNode = function(id) {
        return this.storage.hasOwnProperty(id);
    };

    /**
     * Get a node from the storage.
     * If the node is not in the storage return null instead.
     *
     * @function getNodeById
     * @memberOf Builder.NodeStorage
     *
     * @param {string} id
     *
     * @returns {Builder.CrNode}
     */
    NodeStorage.prototype.getNodeById = function(id) {
        if(this.storage.hasOwnProperty(id)) {
            return this.storage[id];
        } else {
            return null;
        }
    };

    /**
     * Add a field to the given node.
     *
     * @throws {TypeError} Throws an {@link TypeError} if the given field is not an instance of {@link Field}.
     * @throws {Error} Throws an {@link Error} if the given id is not found in the storage.
     * @throws {Error} Throws an {@link Error} when there is already a field with the same name attached to the node.
     *
     * @function addField
     * @memberOf Builder.NodeStorage
     *
     * @param {string} id ID of the node to add the field to
     * @param {Parser.Field} field The field to add
     */
    NodeStorage.prototype.addField = function(id, field) {
        var node = this.getNodeById(id);
        if(!node) {
            throw new Error('Node id `' + id + '` not found.');
        }

        node.addField(field);
    };

    /**
     * Creates a relation between two structures.
     * The source structure must be initialized.
     *
     * @function addRelation
     * @memberOf Builder.NodeStorage
     *
     * @param {string} sourceId
     * @param {Parser.Parser.Include} relationInclude
     */
    NodeStorage.prototype.addRelation = function(sourceId, relationInclude) {
        var node = this.getNodeById(sourceId);
        if(!node) {
            throw new Error('Node id `' + sourceId + '` not found.');
        }

        node.addRelation(relationInclude);
    };

    // Propagate NodeStorage and CrNode class
    module.exports = {
        NodeStorage     : NodeStorage,
        CrNode          : CrNode
    };
})(module);