// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../helpers/test');
const testIfDb = testhelpers.testIfDb;
const removeFromDb = testhelpers.removeFromDb;

const latest = require('./latestState');

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

const latestState = { ...params, id: '1234', state: baseState, exportLogs: ['export1', 'export2'] }

describe('DB latestState tests', testIfDb(() => {
    after(async () => {
        await removeFromDb(newDocUpdate);
    });

    describe('The updateSingle function', () => {
        it('creates item in table for latestState of new doc', async () => {
            const result = await latest.updateSingle(newDocUpdate);
            expect(result).to.have.property('state');
            expect(result.state.type).to.equal('receipt');
        });
        it('retains state when updating exportLogs', async () => {
            const result = await latest.updateSingle(newDocUpdate2);
            expect(result).to.have.property('state');
            expect(result.state.type).to.equal('receipt');
            expect(result).to.have.property('exportLogs');
        });
        it('throws error if itenName is missing', async () => {
            const result = await latest.updateSingle(wrongUpdate);
            expect(result).to.have.property('error');
        });
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
