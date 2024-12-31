const utils = require('../libs/utils');
const { performance } = require('perf_hooks');
const debug     = require('debug')('oysterdb');

const keyCheck = (key) => {
    if (!key) throw Error('Cache Key is missing');
}

module.exports = ({ prefix, url}) => {

    if (!prefix || !url) throw Error('missing in memory arguments');
    
    /** creating inmemory client */
    const redisClient = require('./redis-client').createClient({url});

    return {
        redisClient,
        pipe: {
            commands: async(arr)=>{
                return await redisClient
                .multi(arr)
                .exec()
            },
            getHashes: async ({keys})=>{
                let pipeline = redisClient.pipeline();
                keys.forEach(k=>{
                    pipeline.hgetall(k);
                });
                let docs = await pipeline.exec();
                docs = docs.map(d=>d[1]);
                return docs;
            }
        },
        search: {
            /**
             * 
             * @param {string} index reperesent the index name ex: 'object:index' 
             */
            createIndex: async ({index, prefix, schema })=>{
                if(!schema || !prefix || !index){
                    throw Error('missing args')
                }
                /** check if index already exists */
                let indices = await redisClient.call('FT._LIST');
                debug('indices', indices);

                /** drop index if exists */
                if (indices.includes(index)) {
                    await redisClient.call('FT.DROPINDEX', index);
                    /** index already exists */
                }

                let schemaArgs = [];
                let schemaKeys = Object.keys(schema);
                for(let i=0; i<schemaKeys.length; i++){
                    let skey = schemaKeys[i];
                    schemaArgs.push(skey);
                    let fieldType = schema[skey].store;
                    schemaArgs.push(fieldType);
                    if(schema[skey].sortable){
                        schemaArgs.push('SORTABLE');
                    }
                }

                const args = ['FT.CREATE', index, 'ON', 'hash', 'PREFIX', '1', prefix, 'SCHEMA', ...schemaArgs];
                await redisClient.call(...args)
            },

            find: async({query, searchIndex, fields, offset, limit, sort, sortingType})=>{
                const startTime = performance.now()
                let res = [];
                offset = offset || 0;
                limit = limit || 50;
                sort = sort || null
                sortingType = sortingType || 'desc'
                try {
                    let args = ['FT.SEARCH', searchIndex, query, 'LIMIT', offset, limit];
                    if(sort){
                        args = args.concat(['SORTBY', sort, sortingType]);
                    }
                    if(fields){
                        args = args.concat(['RETURN', fields.length], fields);
                    }
                    debug(`search -->`, args.join(' '));
                    res = await redisClient.call(...args);
                } catch(error){
                    console.log(error);
                    return {error: error.message || 'unable to execute'};
                }
                let [count, ...foundKeysAndSightings] = res;
                let foundSightings = foundKeysAndSightings.filter((entry, index) => index % 2 !== 0)
                let sightings = foundSightings.map(sightingArray => {
                  let keys = sightingArray.filter((_, index) => index % 2 === 0)
                  let values = sightingArray.filter((_, index) => index % 2 !== 0)
                  return keys.reduce((sighting, key, index) => {
                    sighting[key] = values[index]
                    return sighting
                  }, {})
                })
                const endTime = performance.now();
                return { count, docs: sightings, time:  `${Math.trunc(endTime - startTime)}ms`};
            }

            
        },
        hash: {
            set: async({key, data})=>{
                let keys = Object.keys(data);
                let args = [key];
                for(let i=0; i<keys.length; i++){
                    args.push(keys[i]);
                    args.push(data[keys[i]]);
                }
                let result = await redisClient.hset(...args);
                return result;
            },
            remove: async({key, fields})=>{
                let args = [key];
                args = args.concat(fields);
                let result = await redisClient.hdel(...args);
                return result;
            },
            incrby: async ({ key, field, incr }) => {
                let result = await redisClient.hincrby(key, field, incr || 1);
                return result;
            },
            get: async ({ key }) => {
                let result = await redisClient.hgetall(key);
                return result;
            },
            setField: async ({ key, fieldKey, data }) => {
                let result = await redisClient.hset(key, fieldKey, data);
                return result;
            },
    
            getField: async ({ key, fieldKey }) => {
                let result = await redisClient.hget(key, fieldKey);
                return result;
            },
            
            
            getFields: async ({ key, fields }) => {
                let result = await redisClient.hmget(key, ...fields);
                /** resuts are retruned as an array of values with the same order of the fields */
                if(result){
                    let obj = {};
                    for(let i=0; i<fields.length; i++){
                        obj[fields[i]]=result[i];
                    }
                    return obj;
                } 
                return result;
            },
        },
        key: {
            expire: async ({ key, expire }) => {
                let result = await redisClient.expire(key, expire);
                return result;
            },
    
            exists: async ({ key }) => {
                let result = await redisClient.exists(key);
                return (result === 1);
            },
    
            delete: async ({ key }) => {
                keyCheck(key);
                let result = false;
                try {
                    await redisClient.del(key);
                    result = true;
                    return result;
                } catch (err) {
                    console.log(`failed to get result for key ${key}`);
                }
                return result;
            },

            set: async ({ key, data, ttl }) => {
                keyCheck(key);
                let result = false;
                let args = [key, data];
                if (ttl) args = args.concat(["EX", ttl]);
                try {
                    await redisClient.set(...args);
                    result = true;
                } catch (err) {
                    console.log('failed to save to reddit')
                }
                return result;
            },
    
            get: async ({ key }) => {
                keyCheck(key);
                let result = '';
                try {
                    result = await redisClient.get(key);
                } catch (err) {
                    console.log(`failed to get result for key ${key}`);
                }
                /** redis returned string 'null' when the key is not found */
                return result;
            },
    
        },
        set: {
            add: async ({ key, arr }) => {
                keyCheck(key);
                let result = await redisClient.sadd(key, ...arr);
                return result;
            },
            remove: async ({ key, arr }) => {
                keyCheck(key);
                let result = await redisClient.srem(key, ...arr);
                return result;
            },
            /** get whole set */
            get: async ({ key }) => {
                let result = await redisClient.smembers(key);
                return result;
            },
        },
        sorted: {
            get: async ({ sort, key, withScores = false, start, end, startByScore, endByScore, limit, byScore = false }) => {
                keyCheck(key);
                let res = null;
                if (!start) start = 0;
                if (!end) end = 50;
                let min = start;
                let max = end;
                let args = ["ZRANGE"];
                args = args.concat([key, min, max]);
                if(!sort)sort='H2L';
                if(sort.toUpperCase()=="H2L"){
                    args.push("REV");
                } 
                if(withScores)args.push("WITHSCORES");
                debug('<----ARGS--->');
                debug(...args);
                try {
                    res = await redisClient.call(...args);
                } catch(err){
                    return {error: err.message?err.message:err};
                }
                if(withScores)res = utils.arrayToObj(res);
                return  res|| [];
            },
            getByScore: async ({ sort, key, withScores = false, start, end, limit }) => {
                keyCheck(key);
                let res = null;
                if (!start) start = "-INF";
                if (!end) end = "+INF";
                if (!limit) limit = 50;
                let min = start;
                let max = end;
                let args = ["ZRANGE"];
                //* zrange rm:topic:Ug0i91ZDr:post -300 +INF byscore LIMIT 0 3
                args = args.concat([key, min, max, "byscore", "LIMIT", 0, limit]);
                if(!sort)sort='H2L';
                if(sort.toUpperCase()=="H2L"){
                    args.push("REV");
                } 
                if(withScores)args.push("WITHSCORES");
                debug('<----ARGS--->');
                debug(...args);
                try {
                    res = await redisClient.call(...args);
                } catch(err){
                    return {error: err.message?err.message:err};
                }
                if(withScores)res = utils.arrayToObj(res);
                return  res|| [];
            },
            count: async({key})=>{
                let args = ["ZCOUNT", key, '-INF', '+INF'];
                let res = {};
                try {
                    res = await redisClient.call(...args);
                } catch(err){
                    return {error: err.message?err.message:err};
                }
                return res;
            },
            getScoresOf: async({key, items})=>{
                let args = ["ZMSCORE", key].concat(items);
                let res = {};
                try {
                    let out = await redisClient.call(...args);
                    if(Array.isArray(out)){
                        out.forEach((v,i)=>{
                            if(out[i])res[items[i]]=out[i];
                        });
                    }
                } catch(err){
                    return {error: err.message?err.message:err};
                }
                return res;
            },
            update: async({key, scores})=>{
                let args = [key].concat(scores);
                try {
                    await redisClient.call('ZADD', ...args);
                } catch(err){
                    console.log(err);
                }
            },
            addIfNotExists: async({key, scores})=>{
                let args = [key, 'NX'].concat(scores);
                try {
                    await redisClient.call('ZADD', ...args);
                } catch(err){
                    console.log(err);
                }
            },
            set: async ({key, scores})=>{
                let args = [key].concat(scores);
                try {
                    await redisClient.call('ZADD', ...args);
                } catch(err){
                    console.log(err);
                }
            },
            incrBy: async({key, field, score})=>{
                let args = [key, score, field];
                try {
                    await redisClient.call('ZINCRBY', ...args);
                } catch(err){
                    console.log(err);
                }
            },
            remove: async({key, field})=>{
                let args = [key, field];
                try {
                    await redisClient.call('ZREM', ...args);
                } catch(err){
                    console.log(err);
                }
            },
            getRandom: async({key, count})=>{
                let args = [key, count];
                try {
                    await redisClient.call('ZRANDMEMBER', ...args);
                } catch(err){
                    console.log(err);
                }
            },


        }
    }

    
}
