// for testing (duh)
const chai = require('chai');
const expect = chai.expect;

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

describe('DB latestState tests', () => {
    describe('The addExportParams function', () => {
        it('adds an export file to the exportLogs of a doc', () => {
            const result = latest.addExportParams({ latestState, exportName: 'newexport' });
            expect(result.Update.ExpressionAttributeValues[':ns0'][0]).to.equal('newexport');
        });
    });

    describe('The removeExportParams function', () => {
        it('removes the latest exported state from a single doc', async () => {
            const result = await latest.removeExportParams({ latestState });
            expect(result.Update.ExpressionAttributeValues[':ns0'][0]).to.equal('export2');
        });
    });
});
