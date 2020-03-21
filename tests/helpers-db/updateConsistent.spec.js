// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const removeFromDb = testhelpers.removeFromDb;

const updateConsistent = require('../../src/helpers-db/updateConsistent');
const update = require('../../src/helpers-db/update');

const adminCode = '9999';
const params = { adminCode, stateName: 'latestState' };

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const newDocUpdate = { ...params, id: '1234', itemUpdates: [{ itemName: 'state', newState: baseState }] }
const updateParams = update.singleWithItemsParams(newDocUpdate);

describe('The DB updateConsistent tests', testIfDb(() => {
    after(async () => {
        await removeFromDb(newDocUpdate);
    });
    describe('The transact function', () => {
        it('creates item in table for latestState of new doc', async () => {
            const updates = [updateParams];
            const result = await updateConsistent.transact({ updates });
            expect(result).to.be.an('object');
        });
    });
}));
