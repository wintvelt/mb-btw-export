// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testHelpers = require('../../src/helpers/test');

const adminCode = testHelpers.adminCode;
const access_token = testHelpers.access_token;

const s3 = require('../../src/helpers-s3/s3');
const excel = require('../../src/helpers-excel/excel');

const testContent = JSON.stringify({ message: 'Dit is gewoon een test' }, null, 2);
const testDocs = [
    {
        id: '282167354227426465',
        date: '2020-01-01',
        type: 'purchase_invoice',
        diff: [{
            tax_rate_id: '243231935134958924',
            ledger_account_id: '249402224261727583',
            change: 'added',
            amount: 9750
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
];


describe('AWS s3 tests', () => {
    describe('The save function', () => {
        it('saves a testDoc json on S3', async () => {
            const saveParams = {
                adminCode,
                filename: 'testfile.json',
                content: testContent,
                contentType: 'application/json'
            }
            const result = await s3.save(saveParams);
            expect(result).to.have.property('ETag');
        });
        it('saves a test excel on S3', async () => {
            const xlsRows = await excel.makeXlsRows({ exportDocs: testDocs, adminCode, access_token });
            const buffer = await excel.makeXls(xlsRows);

            const saveParams = {
                adminCode,
                filename: 'test-xls.xlsx',
                content: buffer,
                contentType: 'application/octet-stream'
            }
            const result = await s3.save(saveParams);
            expect(result).to.have.property('ETag');
        });
    });

    describe('The delete function', () => {
        it('deletes a doc from s3', async () => {
            const result1 = await s3.delete({ adminCode, filename: 'testfile.json' });
            const result2 = await s3.delete({ adminCode, filename: 'test-xls.xlsx' });
            expect(result1).to.not.have.property('error');
            expect(result2).to.not.have.property('error');
        });
    });

});
