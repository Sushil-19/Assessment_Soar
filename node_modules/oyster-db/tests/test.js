const Oyster = require('../index');
const oyster = new Oyster({ url: "redis://localhost:6379", prefix: "none" });

let res = oyster.call('add_block',{
    _label: 'test',
    _id: '12345',
    _hosts: ['school:019029'],
    _members: ['hoppies:039049'],
    fullname: 'bahi hussein abdel baset',
    lastname: 'ismail',
    label: 'vodo',
    hoppies: 'flying',
    ok: ['3', '3', '3', '123'],
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
test('a block should be added and deleted', async () => {
    try {
        res = await res;
    } catch (error) {
        test('there was an error', () => {
            expect(error).toBeNull();
        });
    }
    expect(res).toEqual({
        _label: 'test',
        _id: 'test:12345',
        fullname: 'bahi hussein abdel baset',
        lastname: 'ismail',
        label: 'vodo',
        hoppies: 'flying',
        ok: '["3","3","3","123"]',
        tom: { cort: { r: 0.123, x: 'will be deleted' } },
        experince: { dog_years: 154 }
    });
    res = oyster.call('delete_block','test:12345');
    try {
        res = await res;
    } catch (error) {
        test('there was an error', () => {
            expect(error).toBeNull();
        });
    }
    expect(res).toEqual({ok: true});
});
afterAll(done => {
    oyster.close()
    done();
})