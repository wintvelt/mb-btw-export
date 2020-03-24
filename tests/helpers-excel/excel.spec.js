// for testing (duh)
'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfS3 = testhelpers.testIfS3;
const adminCode = testhelpers.adminCode;

const excel = require('../../src/helpers-excel/excel');

const testDocs = [
    {
        id: '244931355136231369',
        state: {
            date: '2020-01-01',
            type: 'receipt',
            company: 'test supplier',
            country: ''
        },
        diff: [{
            tax_rate_id: '243232725503313338',
            ledger_account_id: '249389258872194167',
            change: 'added',
            amount: 143.3
        }]
    },
    {
        id: 'other id',
        state: {
            date: '2020-02-01',
            type: 'receipt',
            company: 'test supplier 2',
            country: 'BE'
        },
        diff: [{
            tax_rate_id: '243232725503313338',
            ledger_account_id: '249402226459542918',
            change: 'added',
            amount: 56.7
        }]
    },
    {
        id: '282168015182628005',
        state: {
            date: '2020-01-02',
            type: 'receipt',
            company: 'test supplier',
            country: ''
        },
        diff: [{
            tax_rate_id: '249388000037832645',
            ledger_account_id: '249402226459542918',
            change: 'added',
            amount: 586.33
        }]
    },
]

describe('excel creation tests', testIfS3(() => {
    describe('The makeXlsRows function', () => {
        it('creates xls rows', async () => {
            const result = await excel.makeXlsRows({ exportDocs: testDocs, adminCode });
            expect(result).to.be.an('array');
            const firstRow = result[0];
            expect(firstRow).to.be.an('array').and.have.lengthOf(11);
        });
    });
    describe('The makeXlsSumRows function', () => {
        it('creates xls sum rows', async () => {
            const rows = await excel.makeXlsRows({ exportDocs: testDocs, adminCode });
            const result = excel.makeXlsSumRows({exportRows: rows});
            expect(result.sumRows).to.be.an('array');
            expect(result.catRows).to.be.an('array');
        });
    });
    describe('The makeXls function', () => {
        it('returns an xls buffer when provided with xlsRows', async () => {
            const xlsRows = await excel.makeXlsRows({ exportDocs: testDocs, adminCode });
            const buffer = await excel.makeXls(xlsRows);
        });
    });
}));
