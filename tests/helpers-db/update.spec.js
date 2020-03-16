// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const removeFromDb = testhelpers.removeFromDb;

const update = require('../../src/helpers-db/update');

const adminCode = '9999';
const params = { adminCode, stateName: 'latestState' };

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const newDocUpdate = { ...params, id: '1234', itemName: 'state', newState: baseState }
const newDocUpdate2 = { ...params, id: '1234', itemName: 'exportLogs', newState: ['export123'] };
const wrongUpdate = { ...newDocUpdate, itemName: null };

const newDocUpdateWithItems = {
    ...params, id: '1235',
    itemUpdates: [
        { itemName: 'state', newState: baseState },
        { itemName: 'exportLogs', newState: ['export123'] }
    ]
}


describe('The DB update tests', testIfDb(() => {
    after(async () => {
        await removeFromDb(newDocUpdate);
        await removeFromDb(newDocUpdateWithItems);
    });
    describe('The single function', () => {
        it('creates item in table for latestState of new doc', async () => {
            const result = await update.single(newDocUpdate);
            expect(result).to.have.property('state');
            expect(result.state.type).to.equal('receipt');
        });
        it('retains state when updating exportLogs', async () => {
            const result = await update.single(newDocUpdate2);
            expect(result).to.have.property('state');
            expect(result.state.type).to.equal('receipt');
            expect(result).to.have.property('exportLogs');
        });
        it('throws error if itenName is missing', async () => {
            const result = await update.single(wrongUpdate);
            expect(result).to.have.property('error');
        });
    });

    describe('The singleWithItems function', () => {
        it('creates item in table for latestState of new doc', async () => {
            const result = await update.singleWithItems(newDocUpdateWithItems);
            expect(result).to.have.property('exportLogs');
            expect(result.state.type).to.equal('receipt');
        });
    });
}));
