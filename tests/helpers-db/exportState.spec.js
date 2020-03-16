// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;

const exportState = require('../../src/helpers-db/exportState');

describe('Dynamo DB exporState tests', testIfDb(() => {
    describe('The getUnexported function', () => {
        it('retrieves docIds from unexported list that match the date range', async () => {
            const params = { 
                adminCode, 
                start_date: '2019-01-01',
            }
            const result = await exportState.getUnexported(params);
            expect(result).to.be.an('array');
        });
    });
}));
