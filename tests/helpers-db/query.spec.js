// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;

const query = require('../../src/helpers-db/query');

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const batchList = [
    { id: '1234', state: baseState },
    { id: '1235', state: { ...baseState, type: 'purchase_invoice' } },
    { id: '1236', state: { ...baseState, isDeleted: true } }
]

describe('DB query tests', () => {
    describe('The makeVersionSet function', () => {
        it('normally returns an object with ids and versions', () => {
            const response = query.makeVersionSet(batchList);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array').and.have.lengthOf(1);
            expect(response.receipts[0]).to.have.property('version');
        });
        it('returns an error if 1 of the records has no state', () => {
            const corruptBatchList = [...batchList, { id: '4567' }];
            const response = query.makeVersionSet(corruptBatchList);
            expect(response).to.have.property('error');
        });
    });

    describe('The queryVersions function', testIfDb(() => {
        it('normally returns an object with array for receipts and purchase invoices', async () => {
            const response = await query.queryVersions({ adminCode });
            expect(response).to.have.property('LastEvaluatedKey');
            const items = response.items;
            expect(items).to.have.property('receipts');
            expect(items.receipts).to.be.an('array');
        });
    }));

    describe('The queryStats function', testIfDb(() => {
        it('returns an object with array of stats for past exports', async () => {
            const response = await query.queryStats({ adminCode });
            const items = response.Items;
            expect(items).to.be.an('array');
            if (items.length > 0) {
                const item = items[0];
                expect(item).to.have.property('doc_count');
                expect(item).to.have.property('start_date');
                expect(item).to.have.property('end_date');
                expect(item).to.have.property('url');
            }
        });
    }));
});
