// test for syncing moneybird data
'use strict';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const fetchVersions = require('./fetchVersions');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN,
    TableName: 'btw-export-dev-docs'
}

const testMb = (process.env.TEST_MB_ON && process.env.TEST_MB_ON !== "false");
const testIf = (testFunc) => {
    if (testMb) return testFunc;
    return () => {
        it('moneybird tests did not run', () => {});
    }
}

describe('Moneybird sync (fetchVersions) Functions', testIf(() => {
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
