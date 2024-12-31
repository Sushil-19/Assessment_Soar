
const Redis = require("ioredis");



const createClient = ({ url }) => {

  const redis = new Redis(url);

  //register client events
  redis.on('error', (error) => {
    console.log('error', error);
  });

  return redis;
}


exports.createClient = createClient;
