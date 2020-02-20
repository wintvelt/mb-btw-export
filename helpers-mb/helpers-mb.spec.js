// test for getting moneybird data
'use strict';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const fetch = require('./fetch');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN
}

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
    added: [
        '281006246928057913',
        '281006234492994947',
        '280803397323458059',
        '280803385969477035',
    ],
    changed: [
        '280798732837979238',
        '280798698051471176',
        '280798685442344723',
        '280187351287727914',
    ],
    deleted: [
        '280177277441935154',
        '280177242400621828'
    ]
};

describe('Moneybird data fetching tests', () => {
    describe('The fetch.singleFetch function', () => {
        const params = { ...context, type: 'receipts', ids: testReceiptIds };
        it('successfully retrieves data from Moneybird', async () => {
            const response = await fetch.singleFetch(params);
            expect(response).to.be.an('array').and.have.lengthOf(10);
            const firstItem = response[0];
            expect(firstItem).to.have.property('id');
        });
        it('returns an error when access_token is invalid', async () => {
            const wrongParams = { ...params, access_token: 'wrong' };
            const response = await fetch.singleFetch(wrongParams);
            expect(response).to.have.property('error');
        });
    });
    describe('The fetch.typeFetch function', () => {
        const params = { ...context, type: 'receipts', idSet: testReceiptSet };
        it('successfully retrieves data from Moneybird', async () => {
            const response = await fetch.typeFetch(params);
            expect(response).to.be.an('array').and.have.lengthOf(8);
            const firstItem = response[0];
            expect(firstItem).to.have.property('id');
            expect(firstItem.latest_state).to.have.property('date');
            expect(firstItem).to.not.have.property('events');
        });
        it('returns empty list if input is empty', async () => {
            const paramsWithEmptySet = { ...params, idSet: { added: [], changed: [] } }
            const response = await fetch.typeFetch(paramsWithEmptySet);
            expect(response).to.be.an('array').and.have.lengthOf(0);
        });
        it('returns an error if moneybird fetch failed', async () => {
            const wrongParams = { ...params, access_token: 'wrong' }
            const response = await fetch.typeFetch(wrongParams);
            expect(response).to.have.property('error');
        });
    });
});