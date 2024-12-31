const Pineapple  = require('qantra-pineapple');
const _          = require('lodash');
const labelSchema = require('./label.schema');

const labelPine = new Pineapple({});

exports.addLabel = async (args)=>{
    return await labelPine.validate(args, labelSchema.addLabel);
}