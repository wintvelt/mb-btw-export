// for testing (duh)
const chai = require('chai');
const expect = chai.expect;

const unexported = require('../../src/helpers-db/unexported');

const adminCode = '9999';

const baseDetails = {
    id: '1',
    total_price_excl_tax_with_discount_base: '123.45',
    tax_rate_id: '45676',
    ledger_account_id: '10'
};
const beforeExport = {
    adminCode, id: '1234',
    stateName: 'export123',
    state: { type: 'receipt', date: '2020-01-08', version: 12, details: [baseDetails] },
    timeStamp: 'sometime'
};
const newChangedRecord = {
    adminCode, id: '1234',
    stateName: 'latestState',
    state: {
        type: 'receipt', date: '2020-01-08', version: 14, details: [{
            ...baseDetails,
            tax_rate_id: '0',
            total_price_excl_tax_with_discount_base: '150',
        }]
    },
    exportLogs: ['export123'],
    timeStamp: 'sometime'
};
const newUnchangedStateRecord = {
    ...newChangedRecord,
    state: {
        type: 'receipt', date: '2020-01-20', version: 14, details: [baseDetails]
    }
};
const newDeletedStateRecord = {
    adminCode, id: '1234',
    stateName: 'latestState',
    state: { isDeleted: true },
    exportLogs: ['export123'],
    timeStamp: 'sometime'
};
const beforeExportDeleted = {
    adminCode, id: '1235',
    stateName: 'export123',
    state: { type: 'receipt', date: '2020-01-08', isDeleted: true },
    timeStamp: 'sometime'
};
const newDeletedStateRecord2 = {
    ...newDeletedStateRecord,
    id: '1235'
}
const neverExportedDeletedRecord = {
    adminCode, id: '1234',
    stateName: 'latestState',
    state: { isDeleted: true },
    exportLogs: [],
    timeStamp: 'sometime'
};

describe('The DB unexported.updateUnexportedParams function', () => {
    it('adds state and diff to unexported if the latestState is unexported', () => {
        const result = unexported.updateUnexportedParams({
            latestState: newChangedRecord,
            latestExport: beforeExport
        });
        expect(result).to.have.property('Update');
    });
    it('removes docId from unexported list if the latestState is same as last export', async () => {
        const result = unexported.updateUnexportedParams({
            latestState: newUnchangedStateRecord,
            latestExport: beforeExport
        });
        expect(result).to.have.property('Delete');
    });
    it('adds docId to unexported list with state isDeleted if the latestState is deleted', async () => {
        const result = unexported.updateUnexportedParams({
            latestState: newDeletedStateRecord,
            latestExport: beforeExport
        });
        const names = result.Update.ExpressionAttributeNames;
        const keyWithState = Object.keys(names).find(name => names[name] === 'state');
        const valueWithState = ':ns'+keyWithState.slice(3);
        const state = result.Update.ExpressionAttributeValues[valueWithState];
        expect(state.isDeleted).to.be.true;
    });
    it('removes docId from unexported list if the latestState is deleted and last export also', async () => {
        const result = unexported.updateUnexportedParams({
            latestState: newDeletedStateRecord2,
            exportState: beforeExportDeleted
        });
        expect(result).to.have.property('Delete');
    });
    it('removes docId from unexported list if the latestState is deleted and never exported', async () => {
        const result = unexported.updateUnexportedParams({
            latestState: neverExportedDeletedRecord,
            latestExport: undefined
        });
        expect(result).to.have.property('Delete');
    });
});
