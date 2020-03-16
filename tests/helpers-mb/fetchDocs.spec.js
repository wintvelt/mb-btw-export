// test for getting moneybird data
'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfMb = testhelpers.testIfMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const context = { adminCode, access_token };

const fetchDocs = require('../../src/helpers-mb/fetchDocs');

const testReceiptIds = [
    '281006246928057913',
    '281006234492994947',
    '280803397323458059',
    '280803385969477035',
    '280798732837979238',
    '280798698051471176',
    '280798685442344723',
    '280187351287727914',
    '280177277441935154',
    '280177242400621828'
];
const testReceiptSet = {
    added: ['281006246928057913', '281006234492994947', '280803397323458059', '280803385969477035'],
    changed: ['280798732837979238', '280798698051471176', '280798685442344723', '280187351287727914'],
    deleted: ['280177277441935154', '280177242400621828']
};

const testPurchInvSet = {
    added: ['280810549233583668', '280810535670252833', '280810527657034919'],
    changed: ['280798859328751233', '280798846578067028'],
    deleted: ['280798825692530150']
};

const changeSet = { receipts: testReceiptSet, purchase_invoices: testPurchInvSet };

describe('Moneybird data fetching tests', testIfMb(() => {
    describe('The fetchDocs.singleFetch function', () => {
        const params = { ...context, type: 'receipt', ids: testReceiptIds };
        it('successfully retrieves data from Moneybird', async () => {
            const response = await fetchDocs.singleFetch(params);
            expect(response).to.be.an('array').and.have.lengthOf(10);
            const firstItem = response[0];
            expect(firstItem).to.have.property('id');
        });
        it('returns an error when access_token is invalid', async () => {
            const wrongParams = { ...params, access_token: 'wrong' };
            const response = await fetchDocs.singleFetch(wrongParams);
            expect(response).to.have.property('error');
        });
    });

    describe('The fetchDocs.typeFetch function', () => {
        const params = { ...context, type: 'receipt', typeChangeSet: testReceiptSet };
        it('successfully retrieves data from Moneybird', async () => {
            const response = await fetchDocs.typeFetch(params);
            expect(response).to.be.an('array').and.have.lengthOf(8);
            const firstItem = response[0];
            expect(firstItem).to.have.property('id');
            expect(firstItem.latestState).to.have.property('date');
            expect(firstItem).to.not.have.property('events');
        });
        it('returns empty list if input is empty', async () => {
            const paramsWithEmptySet = { ...params, typeChangeSet: {} }
            const response = await fetchDocs.typeFetch(paramsWithEmptySet);
            expect(response).to.be.an('array').and.have.lengthOf(0);
        });
        it('returns an error if moneybird fetch failed', async () => {
            const wrongParams = { ...params, access_token: 'wrong' }
            const response = await fetchDocs.typeFetch(wrongParams);
            expect(response).to.have.property('error');
        });
    });

    describe('The fetchDocs.fullFetch function', () => {
        const params = { ...context, changeSet };
        it('successfully creates a latest state list from Moneybird data', async () => {
            const response = await fetchDocs.fullFetch(params);
            expect(response).to.be.an('array').and.have.lengthOf(16);
            const deletedItems = response.filter(it => it.latestState.isDeleted);
            expect(deletedItems).to.have.lengthOf(3);
        });
        it('returns empty list if changeset is empty', async () => {
            const emptySet = { added: [], changed: [], deleted: [] };
            const emptyChangeSet = {
                receipts: { ...emptySet },
                purchase_invoices: { ...emptySet }
            }
            const paramsWithEmpty = { ...params, changeSet: emptyChangeSet }
            const response = await fetchDocs.fullFetch(paramsWithEmpty);
            if (response.error) console.log(response);
            expect(response).to.be.an('array').and.be.empty;
        });
        it('returns an error if moneybird fetch failed', async () => {
            const wrongParams = { ...params, access_token: 'wrong' }
            const response = await fetchDocs.fullFetch(wrongParams);
            expect(response).to.have.property('error');
        });
    })
}));