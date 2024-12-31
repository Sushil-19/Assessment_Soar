const Pineapple           = require('qantra-pineapple');
const _                  = require('lodash');

const models = {
    id: {
        type: 'string',
        length: {min: 3, max: 300},
    }
}

const blockPine = new Pineapple({
    models,
    customValidators: {
    'switch': (data)=>{
        let switchKeys = Object.keys(data);
        let valid = true;
        for(let i=0; i<switchKeys.length; i++){
            if(typeof data[switchKeys[i]] !== "boolean"){
                valid = false;
                break;
            }
        }
        return valid;
    },
    counter: (data)=>{
        let counterKeys = Object.keys(data);
        let valid = true;
        for(let i=0; i<counterKeys.length; i++){
            if(!_.isNumber(data[counterKeys[i]])){
                valid = false;
                break;
            }
        }
        return valid;
    }
}});


exports.blockPine = blockPine;

exports.validateId = async ({targets, args})=>{
    let schema = []
    for(let i=0; i<targets.length; i++){
        schema.push({
            path: targets[i].path,
            required: targets[i].required,
            model: 'id'
        })
    }
    return (await blockPine.validate(args, schema));
}

exports.validateIdsArr = async ({targets, args})=>{
    let schema = []
    for(let i=0; i<targets.length; i++){
        schema.push({
            path: targets[i].path,
            required: targets[i].required,
            type: 'array',
            length: { min:1 , max: 100 },
            items: {
                model: 'id'
            }
            
        })
    }
    return (await blockPine.validate(args, schema));
}

