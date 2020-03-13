// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../helpers/test');
const testIfDb = testhelpers.testIfDb;
const addToDb = testhelpers.addToDb;
const removeFromDb = testhelpers.removeFromDb;

const unexported = require('./unexported');

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
    state: { type: 'receipt', date: '2020-01-08', version: 12, details: [baseDetails] }
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
    exportLogs: ['export123']
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
    exportLogs: ['export123']
};
const beforeExportDeleted = {
    adminCode, id: '1235',
    stateName: 'export123',
    state: { type: 'receipt', date: '2020-01-08', isDeleted: true }
};
const newDeletedStateRecord2 = {
    ...newDeletedStateRecord,
    id: '1235'
}
const neverExportedDeletedRecord = {
    adminCode, id: '1234',
    stateName: 'latestState',
    state: { isDeleted: true },
    exportLogs: []
};

describe('The DB unexported.updateUnexported function', testIfDb(() => {
    before(async () => {
        await Promise.all([
            addToDb(beforeExport),
        ]);
    });
    after(async () => {
        await Promise.all([
            removeFromDb(beforeExport),
            removeFromDb(beforeExportDeleted),
            // removeFromDb({ adminCode, stateName: 'unexported', id: '1234' })
        ]);
    });
    it('adds state and diff to unexported if the latestState is unexported', async () => {
        const result = await unexported.updateUnexported(newChangedRecord);
        expect(result).to.have.property('diff');
        expect(result.stateName).to.equal('unexported');
    });
    it('removes docId from unexported list if the latestState is same as last export', async () => {
        const result = await unexported.updateUnexported(newUnchangedStateRecord);
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.have.lengthOf(0);
    });
    it('adds docId to unexported list with state isDeleted if the latestState is deleted', async () => {
        const result = await unexported.updateUnexported(newDeletedStateRecord);
        expect(result).to.have.property('diff');
        expect(result.stateName).to.equal('unexported');
        expect(result.state.isDeleted).to.be.true;
    });
    it('removes docId from unexported list if the latestState is deleted and last export also', async () => {
        const result = await unexported.updateUnexported(newDeletedStateRecord2);
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.have.lengthOf(0);
    });
    it('removes docId from unexported list if the latestState is deleted and never exported', async () => {
        const result = await unexported.updateUnexported(neverExportedDeletedRecord);
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.have.lengthOf(0);
    });
}));
