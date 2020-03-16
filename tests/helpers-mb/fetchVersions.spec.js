// test for syncing moneybird data
'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfMb = testhelpers.testIfMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const context = { adminCode, access_token, year: '2020' };

const fetchVersions = require('../../src/helpers-mb/fetchVersions');

describe('Moneybird sync (fetchVersions) Functions', testIfMb(() => {
    describe('The mbTypeSync function', () => {
        it('retrieves set of doc ids from moneybird sync', async () => {
            const response = await fetchVersions.mbTypeSync({ ...context, type: 'receipts' });
            expect(response).to.be.an('array');
        });
        it('returns an error if credentials are wrong', async () => {
            const wrongCreds = { ...context, access_token: 'wrong', type: 'receipts' };
            const response = await fetchVersions.mbTypeSync(wrongCreds);
            expect(response).to.be.have.property('error');
        })
    });

    describe('The mbSync function', () => {
        it('returns an object with receipts and purchase invoices id, versions', async () => {
            const response = await fetchVersions.mbSync(context);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array');
            expect(response.receipts[0]).to.have.property('version');
        });
        it('returns an error if creds are wrong', async () => {
            const wrongCreds = { ...context, access_token: 'wrong' };
            const response = await fetchVersions.mbSync(wrongCreds);
            expect(response).to.be.have.property('error');
        })
    });
}));
