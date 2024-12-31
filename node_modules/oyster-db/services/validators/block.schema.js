exports.addBlock =  [


    {
        label: 'hosts',
        path: 'hosts',
        type: 'array',
        length: { min: 0, max: 50 },
        items: {
            type: 'string',
            model: 'id',
        }
    },
    {
        label: 'members',
        path: 'members',
        type: 'array',
        length: { min: 0, max: 50 },
        items: {
            type: 'string',
            model: 'id',
        }
    },
    {
       label: 'Label',
       path: 'block.label',
       required: true,
       type: 'String',
       length: { min: 1, max: 300 }, 
    },
    {
        label: 'BlockId',
        path: 'block.id',
    },
    {
        label: 'TraceId',
        path: 'block.traceId',
        required: false,
        type: 'string',
        length: { min: 1, max: 300 },
    },
 
    {
        label: 'Data',
        path: 'block.data',
        required: true,
        type: 'Object',
    },

    {
        label: 'Meta',
        path: 'block.meta',
        required: false,
        type: 'Object',
    },
    
]
