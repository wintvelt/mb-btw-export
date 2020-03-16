// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const excel = require('../../src/helpers-excel/excel');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN
};

const testMb = (process.env.TEST_MB_ON && process.env.TEST_MB_ON !== "false");
const testIf = (testFunc) => {
    if (testMb) return testFunc;
    return () => {
        it('moneybird tests did not run', () => { });
    }
}

const testDocs = [
    {
        id: '244931355136231369',
        date: '2020-01-01',
        type: 'receipt',
        diff: [{
            tax_rate_id: '243232725503313338',
            ledger_account_id: '249389258872194167',
            change: 'added',
            amount: 143.3
        }]
    },
    {
        id: '282168015182628005',
        date: '2020-01-02',
        type: 'receipt',
        diff: [{
            tax_rate_id: '249388000037832645',
            ledger_account_id: '249402226459542918',
            change: 'added',
            amount: 586.33
        }]
    },
]

describe('excel creation tests', testIf(() => {
    describe('The makeXlsRows function', () => {
        it('creates xls rows', async () => {
            const result = await excel.makeXlsRows({ exportDocs: testDocs, ...context });
            expect(result).to.be.an('array');
            const firstRow = result[0];
            expect(firstRow).to.be.an('array').and.have.lengthOf(8);
        });
    });
    describe('The makeXls function', () => {
        it('returns an xls buffer when provided with xlsRows', async () => {
            const xlsRows = await excel.makeXlsRows({ exportDocs: testDocs, ...context });
            const buffer = await excel.makeXls(xlsRows);
        });
    });
}));
