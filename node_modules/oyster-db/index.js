const OysterManager  = require('./services/Oyster.manager');

module.exports = class Oyster{
        constructor({ prefix, url }) {
            if (!prefix || !url) throw Error('missing url or prefix');
            this.cache   = require('./cache/cache.dbh')({ prefix, url });
            this.oyster  = new OysterManager({ cache: this.cache });
            /** creating inmemory client */
        }

        async call(fn, args) {
            try{
                let res = await this.oyster.blockManager.call(`${fn}`, args);
                return res;
            } catch(err) {
                return err.message;
            }
        }

        close(fn, args) {
            this.cache.redisClient.quit()
        }
    }

