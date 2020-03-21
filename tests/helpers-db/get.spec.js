// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const addToDb = testhelpers.addToDb;
const removeFromDb = testhelpers.removeFromDb;

const get = require('../../src/helpers-db/get');

const adminCode = '9999';
const params = { adminCode, stateName: 'latestState', id: '1234' };
const nonExistingRecord = { adminCode, stateName: 'latestState', id: '9999' };

describe('The DB updateConsistent tests', testIfDb(() => {
    before(async () => {
        await addToDb({ ...params, state: "TEST" });
    });
    describe('The get function', () => {
        it('gets an item from the DB', async () => {
            const result = await get.get(params);
            expect(result).to.be.an('object');
            expect(result).to.have.property('state');
        });
        it('returns undefined if no record found', async () => {
            const result = await get.get(nonExistingRecord);
            expect(result).to.be.undefined;
        });
    });
    after(async () => {
        await removeFromDb(params);
    });
}));
