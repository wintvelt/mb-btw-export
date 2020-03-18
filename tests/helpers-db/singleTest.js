const query = require('../../src/helpers-db/query');

const adminCode = require('../../src/helpers/test').adminCode;

describe('The single test', () => {
    it('runs a single test', async () => {
        const latest = await query.queryOnce({adminCode, stateName: 'latestState'});
        const unexported = await query.queryOnce({adminCode, stateName: 'unexported'});
        const unexportedIds = unexported.Items.map(it => it.id);
        const notInUnexp = latest.Items.filter(it => !unexportedIds.includes(it.id));
        const result = notInUnexp.map(it => {
            const state = it.state;
            // return {id: it.id, state: state.details? state.details : state}
            return state.details? state.details : state;
        });
        console.log(result)
    }).timeout(20000);
})
