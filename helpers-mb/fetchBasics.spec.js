// test for syncing moneybird data
'use strict';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const fetchBasics = require('./fetchBasics');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN,
}

const testMb = (process.env.TEST_MB_ON && process.env.TEST_MB_ON !== "false");
const testIf = (testFunc) => {
    if (testMb) return testFunc;
    return () => {
        it('moneybird tests did not run', () => {});
    }
}

describe('Moneybird fetch basics function', testIf(() => {
    describe('The fetchBasics function', () => {
        it('retrieves tax rates and ledger account descriptions from moneybird', async () => {
            const result = await fetchBasics.fetchBasics(context);
            const [ taxRates, ledgerAccounts ] = result;
            expect(taxRates).to.be.an('array');
            expect(taxRates[0]).to.have.property('id');
            expect(taxRates[0]).to.have.property('name');
            expect(ledgerAccounts).to.be.an('array');
            expect(ledgerAccounts[0]).to.have.property('id');
            expect(ledgerAccounts[0]).to.have.property('name');
        });
    });
}));
