exports.addLabel = [
    {
        label: 'Label Key',
        path: 'label.key',
        required: true,
        type: 'String',
        length: { min:1, max: 300},
    },
    {
        label: 'Label Type',
        path: 'label.type',
        required: true,
        type: 'String',
        oneOnf: ['block', 'chain'],
    },
    {
        label: 'Schema',
        path: 'label.schema',
        required: true,
        type: 'Array',
        items: [
            {
                path: 'path',
                required: true,
                type: 'String',
                length: { min:1, max: 300},
            },
            {
                path: 'store',
                required: true,
                type: 'String',
                oneOf: ['TEXT', 'TAG', 'NUMERIC', 'GEO'],
            },
            {
                path: 'sortable',
                type: 'boolean',
            }
        ]
    }
]