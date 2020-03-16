// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const removeFromDb = testhelpers.removeFromDb;

const latest = require('../../src/helpers-db/latestState');

const adminCode = '9999';
const params = { adminCode, stateName: 'latestState' };

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const newDocUpdate = { ...params, id: '1234', itemName: 'state', newState: baseState }

const latestState = { ...params, id: '1234', state: baseState, exportLogs: ['export1', 'export2'] }

describe('DB latestState tests', testIfDb(() => {
    after(async () => {
        await removeFromDb(newDocUpdate);
    });

    describe('The addExport function', () => {
        it('adds an export file to the exportLogs of a doc', async () => {
            const result = await latest.addExport({ latestState, exportName: 'newexport' });
            expect(result.exportLogs[0]).to.equal('newexport');
        });
    });

    describe('The removeExport function', () => {
        it('removes the latest exported state from a single doc', async () => {
            const result = await latest.removeExport({ latestState });
            expect(result.exportLogs[0]).to.equal('export2');
        });
    });
}));
