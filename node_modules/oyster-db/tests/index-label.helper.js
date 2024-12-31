module.exports = async({oyster, label, schema})=>{

    console.log(`
    
    * CREATE INDEX ===========
    
    
    `)
    return await oyster.call('search_index', {
        label,
        schema,
    });
}