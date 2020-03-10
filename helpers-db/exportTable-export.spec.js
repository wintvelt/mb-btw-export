// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const exportTableExport = require('./exportTable-export');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};
const adminCode = process.env.ADMIN_CODE;

const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testIf = (testFunc) => {
    if (testDb) return testFunc;
    return () => {
        it('database tests did not run', () => { });
    }
}

describe('Dynamo DB exportTable-export tests', testIf(() => {
    describe('The getDocsToExport function', () => {
        it('retrieves docIds from unexported list that match the date range', async () => {
            const params = { 
                adminCode, 
                start_date: '2019-01-01',
                TableName: testEnv.DYNAMODB_TABLE_EXPORTS 
            }
            const result = await exportTableExport.getDocsToExport(params);
            expect(result).to.be.an('array');
        });
    });
}));
