const exportState = require('../helpers-db/exportState');

const adminCode = require('../helpers/test').adminCode;

describe('The single test', () => {
    it('runs a single test', async () => {
        const result = await exportState.getUnexported({
            adminCode,
            start_date: '2020-01-20',
            end_date: '2020-01-20',
        });
        console.log(result.length);
    })
})
