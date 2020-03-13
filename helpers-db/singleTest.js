const query = require('./query');
const adminCode = require('../helpers/test').adminCode;

describe('The single test', () => {
    it('runs a single test', async () => {
        const result = await query.queryVersionsOnce({ adminCode, stateName: 'latestState' })
        const latestIds = result.map(doc => doc.id);
        console.log(result.length);
        const result2 = await query.queryVersionsOnce({ adminCode, stateName: 'unexported' })
        let unexpIds = result2.map(doc => doc.id);
        console.log(result2.length);
        for (let i = 0; i < latestIds.length; i++) {
            const latest = latestIds[i];
            if (!unexpIds.includes(latest)) {
                console.log(latest);
                console.log(result[i].state)
            }
        }
    })
})
