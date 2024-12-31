const utils = require('../libs/utils');
const debug     = require('debug')('oysterdb');
module.exports = class RelationManager {
    constructor({cache, delimiter, storeKeyMaker, exportBlock}){
        this.cache = cache;

        this.labelDelimiter = delimiter.label;
        this.scoreDelimiter = delimiter.score;
        this.storeKeyMaker  = storeKeyMaker;
        this.exportBlock    = exportBlock;

        this.pluralToSingularMap = {
            '_members': '_member',
            '_hosts': '_host',
        }
        this.singularToPluralMap = {
            ...this.pluralToSingularMap, 
            ...utils.inverseObj(this.pluralToSingularMap),
        };
        this.actionsMap = {
            add: 'addIfNotExists',
            set: 'set',
            remove: 'remove',
            incrBy: 'incrBy',
        }
        this.relationMatrix = {
            _host: '_member',
        }
        this.relationMatrix = {
            ...this.relationMatrix, 
            ...utils.inverseObj(this.relationMatrix),
        };
    }

    _pluralFixer(str){
        let found = this.pluralToSingularMap[str]
        return found?found:str;
    }

    _relMatrixKey(id){
        return `rx:${id}`;
    }

    _exportLabel(id){
        debug(`exporting label from `, id);
        let label =  id.split(this.labelDelimiter)[0];
        debug(label);
        return label;
    }

    _relKeyMaker(prefix, id, label){
        debug(`relKeyMaker`, prefix, id, label)
        return `${prefix}:${id}:${label}`;
    }

    _hostKey(args){
        return this._relKeyMaker('rh', args.id, args.label);
    }

    _memberKey(args){
        return this._relKeyMaker('rm', args.id, args.label);
    }

    _removeStrength(relations){
        return relations.map(r=>{
            let label = r.split('~')[0];
            return label||r;
        })
    }

    /**  calculating the label matrix of fields to make sure that every field has that with in its matrix*/
    _getInRelationMatrix({blockId, relationType, relations}){
        relations = this._removeStrength(relations);
        let arr = [];
        for(let i=0; i<relations.length; i++){
            let item = relations[i];
            let segs = item.split(':');
            if(segs.length>1){
                arr.push(`${relationType}:${segs[0]}`);
            }
        }
        if(arr.length>0){
            return {key: this._relMatrixKey(blockId), arr}
        }
        return null
    }

    _defaultScore(){
        return utils.hrTime();
    }

    /** get flot of string  */
    getFloat(value){
        let res = false;
        if (!isNaN(value)){
            try {
            res = parseFloat(value);
            } catch(err){
            }
        }
        return res; 
    }

    _relIdFixer(p){
        return p.split('~')[0]
    }

    /** relation item score */
    /**
     * takes a string that has two delimiters 
     * the first ~ seperated the key from scores segmenet
     * the second : seperates the score within the scores segment
     * @param {array} arr an array of strings to parse
     * @param {index} the index that of the score that we are looking for 
     * @param {Number} dScore the default score
     * @param {Boolean} removeMissing if a field does't have a score it will not be returned
     * @param {string} defaultField to fix a field in with all score will be assigned to
     * this function designed specially for building the score and key pairs
     * for redis ZADD sorted set.  
     * the default score for missing or invalid fields 
     * will be replaced with 0.<hight resolution timestamp>
     * this is also a specific requirments to the usage of this app
     */
    _formateRIS({arr, index, dScore, removeMissing, defaultField}){

        debug("_formateRIS", {arr, index, dScore, removeMissing});
        if(!index)index=0;
        let selfScore = [];
    
        for(let i=0; i<arr.length; i++){
            let item = arr[i];
            let segs = item.split('~');
            let key  = defaultField?defaultField:segs[0];
            let scoreSegs = [];
            let defaultScore = dScore || parseFloat(`0.${Number(process.hrtime.bigint())}`);

            if(!segs[1]){
                /** 
                 * relation scores missing because there is not score and 
                 * the we didnt ask for the missing to be removed
                 * then we will assign the default score as the item score
                 */
                if(!removeMissing)selfScore = selfScore.concat([defaultScore, key]);
            } else {
                /** relation scores exists */
                scoreSegs = segs[1].split(':');
                let targetSeg = scoreSegs[index];
                if(targetSeg){
                    let score = this.getFloat(targetSeg);
                    if(score !== false){
                        selfScore = selfScore.concat([score, key]);
                    } else {
                        if(!removeMissing && targetSeg!=="!")selfScore = selfScore.concat([defaultScore, key]);
                    }
                } else {
                    if(!removeMissing && targetSeg!=="!" )selfScore = selfScore.concat([defaultScore, key]); 
                }
            }
        }
        debug(`selfSCore ==>`, selfScore)
        return selfScore;
    }


    /** set relation using one specific action */
    async onRelation({action, relationType, relationIds, blockId}){
        debug('onRelation for blockId=>', blockId);
        relationType      = this._pluralFixer(relationType);
        let otherRelation = this.relationMatrix[relationType];
        let actualAction  =  this.actionsMap[action];
        let commands      = [];

        let pairs = this._formateRIS({
            arr: relationIds, index:0, dScore:action=="incrBy"?0:null, 
            removeMissing: action=="set"?true:false});

        for(let i=0; i<pairs.length-1;){
            let key = this[`${relationType}Key`]({id: blockId, label: this._exportLabel(pairs[i+1])});
            /** [score, field] */
            if(action=="incrBy" || action=="remove"){
                if(!pairs[i]==0){
                    if(action=="remove")commands.push(['zrem', key, pairs[i+1]])
                    if(action=="incrBy")commands.push(['zincrby', key, pairs[i], pairs[i+1]]);
                }
            } else {
                if(action=="add")commands.push(['zadd', key, 'NX', pairs[i], pairs[i+1]]);
                if(action=="set")commands.push(['zadd', key, pairs[i], pairs[i+1]]);
            }
            i=i+2;
        }

        if(action!=="remove"){
            let res = this._getInRelationMatrix({blockId, relationType, relations: relationIds });
            if(res) commands.push(['sadd', res.key].concat(res.arr));
        }

        let otherScores = this._formateRIS({
            arr: relationIds, index:1, dScore:action=="incrBy"?0:null, 
            removeMissing: action=="set"?true:false
        });
        
        let blockLabel = this._exportLabel(blockId);

        for(let i=0; i<otherScores.length-1;){
            /** we are doing that here because we need to
             *  extract the key from every object and assign the block with the value to it */
            let p = otherScores[i+1];
            let scores = [otherScores[i], blockId];
            let key = this[`${otherRelation}Key`]({id: p, label: blockLabel});
            if(action=="incrBy" || action=="remove"){
                if(action=="incrBy")commands.push(['zincrby', key, scores[0], scores[1]]);
                if(action=="remove")commands.push(['zrem', key, scores[1]])
            } else {
                /** any other - which is basicly set and get  */
                if(action=="add")commands.push(['zadd', key, 'NX'].concat(scores));
                if(action=="set")commands.push(['zadd', key].concat(scores));
            }
            if(action!=="remove"){
                let res = this._getInRelationMatrix({blockId: p, relationType: otherRelation, relations: [blockId] });
                if(res) commands.push(['sadd', res.key].concat(res.arr));
            }

            i=i+2;
        }
        await this.cache.pipe.commands(commands);
    }

    async getRelations({blockId, withCount}){
        let res = await this.cache.set.get({key: this._relMatrixKey(blockId)});
        let labels = {};
        for(let i=0; i<res.length; i++){
            let item = res[i];
            let segs = item.split(':');
            let relType = segs[0];
            relType = this.singularToPluralMap[relType];
            let label = segs[1];
            if(!labels[relType])labels[relType]=[];
            labels[relType].push(label);
        }
        return labels;
    }

    async navRelation({relationType, blockId, label, withScores, sort, start, end, populate, byScore, limit}){
        if (!withScores) withScores = false;
        relationType = this._pluralFixer(relationType);
        /** getting relations of specific label */
        let key = this[`${relationType}Key`]({ id: blockId, label });
        let res;
        if(!byScore) res = await this.cache.sorted[`get`]({key, withScores, sort, start, end});
        else res = await this.cache.sorted[`getByScore`]({key, withScores, sort, start, end, limit});
        if(!res || (populate && !res.map)){
            debug(res);
            return {error: `unable to find relation ${relationType} for Key ${blockId}`};
        }
        if(populate){
            let keys = res.map(i=>this.storeKeyMaker({fullId: i}));
            let docs = await this.cache.pipe.getHashes({keys});
            docs = docs.map(d=>this.exportBlock(d))
            return docs;
        }
        return res;
    }

    async countRelations({relationType, blockId, label}){
        relationType = this._pluralFixer(relationType);
        /** getting relations of specific label */
        let key =this[`${relationType}Key`]({id: blockId, label})
        let res = await this.cache.sorted[`count`]({key});
        return res;
    }

    async destroyRelation({relationType, blockId, label}){
        relationType = this._pluralFixer(relationType);
        let key = this[`${relationType}Key`]({id: blockId, label})
        let rxKey = this._relMatrixKey(blockId)
        let res = await this.cache.key.delete({key});
        await this.cache.key.delete({key: rxKey});
        return {ok: true};
    }

    async getRelationItemsScore({blockId, relationType, items}){
        relationType = this._pluralFixer(relationType);
        let [label] = items[0].split(":");
        let key =this[`${relationType}Key`]({id: blockId, label});
        let res = this.cache.sorted.getScoresOf({key, items})
        return res;
    }

}