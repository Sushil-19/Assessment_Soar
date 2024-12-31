const Oyster = require('../index');
const oyster = new Oyster({ url: "redis://localhost:6111", prefix: "none" });
const bigRunner = require('./bigRunner.helper')
const indexLabel = require('./index-label.helper');

const createBlock = async()=>{
        return (new Promise(async (resolve)=>{
        
        let addBlock = await oyster.call('add_block',{
            _label: 'comments',
            // _id: 'salaha',
            _hosts: ['school:019029'],
            _members: ['hoppies:039049'],
            fullname: 'bahi hussein abdel baset',
            lastname: 'ismail',
            label: 'vodo',
            hoppies: 'flying',
            ok: ['3','3','3','123'],
            tom: {
                cort: {
                    r: 0.123,
                    x: 'will be deleted'
                }
            },
            experince: {
                dog_years: 154
            }
        });

 
        console.log(`addBlock`,addBlock);
        /** update block */
        let updateBlock = await oyster.call('update_block',{
            _id: addBlock._id,
            _label: 'koshary',
            fullname: 'iwaska',
            teq: '938',
        });

        console.log(`updateBlock`,updateBlock);

        console.log(`addBlock`,addBlock);
        /** update block */
        let setFields = await oyster.call('set_fields',{
            _id: addBlock._id,
            fields: {
                'experince.dog_years': 20,
                'lastname': 'ismail mustafa',
            }
        });

        console.log(`setFields`,setFields);

        let removeFields = await oyster.call('remove_fields',{
            _id: addBlock._id,
            fields: ['tom.cort.x']
        });

        console.log(`removeFields`,removeFields);

        /** update relations */

        let relations = await oyster.call('update_relations', {
            _id: addBlock._id,
            add: {
                _members: ['box:xxx','box:zzzz','box:yyy~5:5','box:yyy~10:10',addBlock._id],
                _hosts: [addBlock._id],
            },
            remove: {
                _members: ['box:zzzz']
            },
            set: {
                _members: ['box:yyy~:_:0'],
            },
            incrBy: {
                _members: ['box:yyy~-100:-6'],
                _hosts: ['box:yyy~10:100']
            }
        });

        console.log('--relations---')
        console.log(relations);
        
        let getRelations = await oyster.call('get_relations', addBlock._id)

        console.log('--get Relations---')

        console.log(getRelations)

        let navRelation = await oyster.call('nav_relation', {
                relation: '_members',
                label: 'comments',
                _id: addBlock._id,
                start: 0,
                end: 2,
                sort: 'h2l',
                withScores: true,
                populate: false,
            }
        )

        console.log('--navRelation---')

        console.log(navRelation);

        let getRelationScores = await oyster.call('relation_score', {
                relation: '_members',
                _id: addBlock._id,
                items:[Object.keys(navRelation)[0]]
        })

        console.log('--getRelationScores---')

        console.log(getRelationScores);

        let destoryRelation = await oyster.call('destroy_relation', {
                relation: '_members',
                label: 'comments',
                _id: addBlock._id,
        });
        console.log('relation destroy -->')
        console.log(destoryRelation);


        let navRelationAgain = await oyster.call('nav_relation', {
                relation: '_members',
                label: 'comments',
                _id: addBlock._id,
                start: 0,
                end: 2,
                sort: 'h2l',
                withScores: true,
                populate: false,
        })

        console.log('--navRelation (AFTER Destroy) ---')

        console.log(navRelationAgain);
        
        
        /**get block */
        let getBlock = await oyster.call('get_block',addBlock._id);

        console.log(`getBlock`,getBlock);

        /** search blocks */
        let result = await oyster.call('search_find', { call: 'search.find', args: {
                label: 'comments',
                populate: ['_id', 'experince.dog_years'],
                limit: 3,
                offset: 0,
                query: {
                    text: 'iwas*',
                    // fields: [
                    //     '@lastname:ism*',
                    //     '@experince.dog_years:[(18 +inf]'
                    // ]
                }
            }
        });
        console.log('--------- result ----------')
        console.log(JSON.stringify(result));


        let deleteBlock = await oyster.call('delete_block',addBlock._id);

        console.log(`deleteBlock`,deleteBlock);


        let getBlockAgain = await oyster.call('get_block',addBlock._id);

        console.log(`getBlock ( AFTER DELETE )`,getBlockAgain);


        
        resolve({});
        
        
    }));

}




// setTimeout(async ()=>{
    // await bigRunner({total: 3, fn: indexLabel, args: {
    //     oyster, 
    //     label: 'comments', 
    //     schema: [
    //     {
    //         path: 'fullname',
    //         store: 'TEXT',
    //         sortable: true,
    //     },
    //     {
    //         path: 'lastname',
    //         store: 'TEXT',
    //         sortable: true,
    //     },
    //     {
    //         path: 'experince.dog_years',
    //         store: 'NUMERIC',
    //     }
    // ] } });
     bigRunner({total: 10, fn: createBlock});
// }, 1000);




