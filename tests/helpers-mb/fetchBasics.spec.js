// test for syncing moneybird data
'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfMb = testhelpers.testIfMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const fetchBasics = require('../../src/helpers-mb/fetchBasics');

describe('Moneybird fetch basics function', testIfMb(() => {
    describe('The fetchBasics function', () => {
        it('retrieves tax rates and ledger account descriptions from moneybird', async () => {
            const result = await fetchBasics.fetchBasics({ adminCode, access_token });
            const [taxRates, ledgerAccounts] = result;
            expect(taxRates).to.be.an('array');
            expect(taxRates[0]).to.have.property('id');
            expect(taxRates[0]).to.have.property('name');
            expect(ledgerAccounts).to.be.an('array');
            expect(ledgerAccounts[0]).to.have.property('id');
            expect(ledgerAccounts[0]).to.have.property('name');
        });
    });
}));
