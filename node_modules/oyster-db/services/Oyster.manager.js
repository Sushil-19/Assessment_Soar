/** the entry point for Oyster Classes  */


const BlockManager = require('./Block.manager');

/** entry point for oyster modules */
module.exports = class OysterManager {
    constructor({ cache }){
        
        /** init cortex */
        this.blockPrefix =  'oo:';

        this.markers = {
            fieldStore: '___'
        }

        this.delimiter = {
            label: ':',
            score: '~',
        }

        this.blockManager = new BlockManager({
            cache,
            blockPrefix: this.blockPrefix,
            markers: this.markers,
            delimiter: this.delimiter,
        });
    }

    async call(fn, data) {
        return await this.blockManager.call(`${fn}`, data);
    };
}