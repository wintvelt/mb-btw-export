// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const AWS = require('aws-sdk');

var AWSS3 = new AWS.S3({
    region: 'eu-central-1'
});

const s3 = require('./s3');
const excel = require('../helpers-excel/excel');

const bucketName = process.env.PUBLIC_BUCKETNAME;

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN
};

const testContent = JSON.stringify({ message: 'Dit is gewoon een test' }, null, 2);
const testDocs = [
    {
        id: '282167354227426465',
        date: '2020-01-01',
        type: 'purchase_invoice',
        latestDiff: [{
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
        latestDiff: [{
            tax_rate_id: '249388000037832645',
            ledger_account_id: '249402226459542918',
            change: 'added',
            amount: 586.33
        }]
    },
];


describe('AWS s3 tests', () => {
    after(async () => {
        await AWSS3.deleteObject({
            Bucket: bucketName,
            Key: 'public-btw/testfile.json'
        }).promise();
        await AWSS3.deleteObject({
            Bucket: bucketName,
            Key: 'public-btw/test-xls.xlsx'
        }).promise();
    })
    describe('The save function', () => {
        it('saves a testDoc json on S3', async () => {
            const saveParams = {
                bucketName,
                filename: 'public-btw/testfile.json',
                content: testContent,
                contentType: 'application/json'
            }
            const result = await s3.save(saveParams);
            expect(result).to.have.property('ETag')
        });
        it('saves a test excel on S3', async () => {
            const xlsRows = await excel.makeXlsRows({ exportDocs: testDocs, ...context });
            const buffer = await excel.makeXls(xlsRows);

            const saveParams = {
                bucketName,
                filename: 'public-btw/test-xls.xlsx',
                content: buffer,
                contentType: 'application/octet-stream'
            }
            const result = await s3.save(saveParams);
            expect(result).to.have.property('ETag');
        });
    });
});
