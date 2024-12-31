const { blockPine , validateId, validateIdsArr }           = require('./validators/block.validator');
const blockSchema         = require('./validators/block.schema');
const { nanoid }          = require('nanoid');
const md5                 = require('md5');
const _                 = require('lodash');
const RelationManager   = require('./Relation.manager');
const utils             = require('../libs/utils');
const debug             = require('debug')('oysterdb');

module.exports = class BlockManager{

    constructor({cache, markers, delimiter, blockPrefix}){

        this.cache                 = cache;
        this.relations             = ['_members', '_hosts'];
        this.exposed               = ['add_block', 'get_block','update_block', 'get_relations', 
        'nav_relation', 'update_relations', 'set_fields', 'remove_fields', 'find','index','forceUpdate',
        'destroy_relation','delete_block','relation_score', 'count_relations', 'search_index', 'search_find', 'call'
        ];
        this.updateRelationActions = ['add','remove','set','incrBy'];
        this.immutableFileds       = ['_label'];
        this.searchable            = null;
        this.markers               = markers;
        this.delimiter             = delimiter;
        this.indexPrefix           = 'oidx:';
        this.blockPrefix           = blockPrefix;
        this.relationManager       = new RelationManager({
            cache, 
            delimiter, 
            storeKeyMaker: this._storeKey.bind(this),
            exportBlock: this.export.bind(this),
        });

    }

    _storeKey({fullId}){
        return `${this.blockPrefix}${fullId}`;
    }

    _createBlockId(block){
        return `${block._label}:${block._id || nanoid()}`;
    }

    async _save(block){
        let blockFields = Object.keys(block);
        let redBlock = {};
        for(let i=0; i<blockFields.length; i++){
            let field = blockFields[i];
            redBlock[field]=block[field];
        }
        await this.cache.hash.set({key: this._storeKey({fullId:redBlock._id}), data: redBlock });
    }

    fieldKeyFixer(str){
        return str.replace(/\./g, this.markers.fieldStore);
    }

    /**
     * 
     * @param {*} block 
     * remove immutable fields from objects
     * @return none 
     */
    _removeImmutableFields(block){
        let keys = Object.keys(block);
        for(let i=0; i<keys.length; i++){
            let key = keys[i];
            if(this.immutableFileds.includes(key)){
                delete block[key];
            }
        }
    }
    

    /** transform the object represeted in 
     * keyvalue pairs to the original form */
    export(block){ 
        let populate=Object.keys(block);
        let blueBlock = {};
        for(let i=0; i<populate.length; i++){
            let field = populate[i];
            /** deflat the flattedned fields */
            if(field.includes(this.markers.fieldStore)){
                utils.setDeepValue({obj:blueBlock, path:field, value: block[field], marker: this.markers.fieldStore});
            } else {
                blueBlock[field]=block[field];
            }
        }
        return blueBlock;
    }

    /** get  */
    async get_block(id){
        let blockId = id;
        let error = await validateId({targets:[{path:'blockId', required: true}], args:{ blockId }});
        if(error) return { error };
        let o = await this.cache.hash.get({key: this._storeKey({fullId:blockId})}); 
        return this.export(o)
    }

    async update_block(block){
        this._removeImmutableFields(block);
        const readyBlock = this._import(block);
        await this._save(readyBlock);
        return this.export(readyBlock)
    }

    async incrFields({_id, fields}){
        let fieldsPaths = Object.keys(fields);
        fieldsPaths.forEach(path=>{
            this.cache.hash.incrby({key: this._storeKey({fullId: _id}), field: this.fieldKeyFixer(path), incr: fields[path]});
        })
        return {ok: true};
    }

    async set_fields({_id, fields}){
        let fieldsPaths = Object.keys(fields);
        let fixedFields = {};
        fieldsPaths.forEach(path=>{
            fixedFields[this.fieldKeyFixer(path)]=fields[path];
        })
        await this.cache.hash.set({key: this._storeKey({fullId: _id}), data: fixedFields});
        return {ok: true}
    }

    async remove_fields({_id, fields}){
        let fixedFields = fields.map(field=>{
            return this.fieldKeyFixer(field);
        })
        await this.cache.hash.remove({key: this._storeKey({fullId: _id}), fields: fixedFields});
        return {ok: true}
    }

    /** remove label from id */
    _sliceLabel(id){
        let frags = id.split(this.delimiter.label);
        frags.shift();
        return frags.join('');
    }

    /** remove and return relations from block */
    _sliceRelations(block){
        let _hosts;
        let _members;
        if(block._hosts)_hosts = block._hosts;
        if(block._members)_members=block._members;
        delete block._hosts;
        delete block._members;
        return {_hosts, _members};
    }

    async add_block(block){
        if(block._id){
            /** should not add a block with existsing id  */
            let key =this._storeKey({fullId: this._createBlockId(block)});
            debug('searching key', key);
            let exists = await this.cache.key.exists({key});
            if(exists) return { error: `an object with id ${block._id} already exists`};
        }
        
        let relations = this._sliceRelations(block);

        /** build block */
        const readyBlock = this._import(this._addShell(block));

        /** save the block */
        await this._save(readyBlock);

        /** relations */
        if(relations._hosts) this.relationManager.onRelation({action: 'add', relationType: '_hosts', relationIds: relations._hosts, blockId: readyBlock._id});
        if(relations._members) this.relationManager.onRelation({action: 'add', relationType: '_members', relationIds: relations._members, blockId: readyBlock._id});

        return this.export(readyBlock);
    }

    async delete_block(_id){
        let res = this.cache.key.delete({key: this._storeKey({fullId: _id})});
        return {ok: true};
    }

    _flatten(ob, marker){
        if(!marker)marker=".";
        var toReturn = {};
        for (var i in ob) {
            if (!ob.hasOwnProperty(i)) continue;
            if ((typeof ob[i]) == 'object' && ob[i] !== null) {
                if(Array.isArray(ob[i])){
                    toReturn[i] = JSON.stringify(ob[i]);
                } else {
                    var flatObject = this._flatten(ob[i], marker);
                    for (var x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) continue;
                        toReturn[i + marker + x] = flatObject[x];
                    }
                }
            } else {
                toReturn[i] = ob[i];
            }
        }
        return toReturn;
    }

    /** add initial block fields */
    _addShell(block){
        block._id = this._createBlockId(block);
        return block;
    }

    /** prepare block for redis store */
    _import(block){
        let dataReady = this._flatten(block, this.markers.fieldStore);
        return dataReady;
    }

    /** manager interceptor */
    async interceptor({data, cb, meta}){
        let fnName = meta.event.split('.')[1];
        if(this.exposed.includes(fnName)){
            let result = await this[fnName](data);
            cb(result);
        } else {
            cb({error: `${fnName} is not executable `});
        }
    }

    async call(fnName, data){
        if(this.exposed.includes(fnName)){
            let result = await this[fnName](data);
            return result;
        } else {
            return {error: `${fnName} is not a function`};
        }
    }

    async update_relations(args){
        let res = {};
        let argsKeys = Object.keys(args);
        for(let i=0; i<argsKeys.length; i++){
            let item = argsKeys[i];
            if(this.updateRelationActions.includes(item)){
                res[item] = await this._updateRelations({action: item, relations: args[item], blockId: args._id});
            }
        }
        return {op: res};
    }

    async _updateRelations({blockId, relations, action}){
        let invalid = false;
        let valid   = [];

        /** validate relations */
        let argsKeys = Object.keys(relations);
        for(let i=0; i<argsKeys.length; i++){
            if(this.relations.includes(argsKeys[i])){
                /** one of the relations */
                let notValid = await validateIdsArr({targets: [{path: argsKeys[i], required: true}], args: relations});
                if(notValid){
                    invalid = argsKeys[i];
                    break;
                } else {
                    valid.push(argsKeys[i]);
                }
            } 
        }

        /** if one relation is invalid */
        if(invalid) return {error: `${invalid} is not valid`};
        
        /** exec relation function on valid items */
        valid.forEach(k=>{
            let inArgs = {action, blockId, relationType:k};
            inArgs.relationIds=relations[k];
            this.relationManager.onRelation(inArgs);
        })

        return {ok: true};
    }

    async get_relations(_id){
        let args = {_id}
        let error = await validateId({targets:[{path:'_id', required: true}], args});
        if(error) return { error };
        args.blockId = args._id;
        return await this.relationManager.getRelations(args);
    }

    async nav_relation(args){
        args.blockId = args._id;
        args.relationType = args.relation;
        /** populate forces withscores off */
        if(args.populate)args.withScores = false;
        return await this.relationManager.navRelation(args);
    }

    async count_relations(args) {
        args.blockId = args._id;
        args.relationType = args.relation;
        const count = await this.relationManager.countRelations(args);
        return {count};
    }

    async destroy_relation(args){
        args.blockId = args._id;
        args.relationType = args.relation;
        return await this.relationManager.destroyRelation(args);
    }

    async relation_score(args){
        args.blockId = args._id;
        args.relationType = args.relation;
        if(args.items.length==0)return {error: 'invalid empty items'};
        return await this.relationManager.getRelationItemsScore(args);
    }

    _schemaKey(){
        return `schema`;
    }

    _indexKey(label){
        return `${this.indexPrefix}${label}`
    }

    /** actuall create the index in search */
    async _createIndex({label,schema}){
        const args = {
            index: this._indexKey(label),
            prefix: `${this.blockPrefix}${label}:`,
            schema: schema,
        }
        debug(`_createIndex`, args);
        this.cache.search.createIndex(args);
    }

    /** exposed functin to creating index */
    async search_index(inIndex){
        let schema = {};
        for(let i=0; i<inIndex.schema.length; i++){
            let field = inIndex.schema[i];
            /** fixing fields to match the way it is store in basicly transforming '.' to '___' */
            schema[this.fieldKeyFixer(`${field.path}`)] = {
                store: field.store.toUpperCase(),
                sortable: field.sortable || false,
            }
        }
        /** storing the schema for reference. */
        await this.cache.hash.setField({key: this._schemaKey(), fieldKey: inIndex.label, data: JSON.stringify(schema) });
        /** creating the indx */
        await this._createIndex({label: inIndex.label, schema});
        /** trigger on index update  */
     
        return {schema}
    }

    
    async search_find({query, label, fields, offset, limit, sort, sortingType}){

        if(!label || !query) return {error: 'query and label are reqired'};
        if(fields)fields=fields.map(p=>this.fieldKeyFixer(p));

        let readyQuery = "";
        if(query.text) readyQuery += query.text;

        if(query.fields){
            let fields = query.fields;
            for(let i=0; i<fields.length; i++){
                let field = fields[i];
                if(field.charAt(0)=="@"){
                    debug('_$_')
                    readyQuery += ` ${this.fieldKeyFixer(field.trim())}`
                } 
            }
        }

        if(!limit) limit=100;
        if(!sort) sort="";
        let result = await this.cache.search.find({
            searchIndex: this._indexKey(label),
            query: `${readyQuery}`,
            fields,
            limit,
            offset,
            sort,
            sortingType
        });

        if(result.error) return {error: result.error};
        result.docs = result.docs.map(doc=>this.exporter(doc));
        return result;
    }
}