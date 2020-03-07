// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const docTable = require('./docTable');
const scan = require('./docTable-scan');
// const updateAll = require('./update-all');

const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testIf = (testFunc) => {
    if (testDb) return testFunc;
    return () => {
        it('database tests did not run', () => {});
    }
}

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};
const adminCode = process.env.ADMIN_CODE;

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const context = { adminCode, TableName: testEnv.DYNAMODB_TABLE_DOCS }
const batchList = [
    { id: '1234', latestState: baseState },
    { id: '1235', latestState: { ...baseState, type: 'purchase_invoice' } },
    { id: '1236', latestState: { ...baseState, isDeleted: true } }
]

describe('Dynamo DB docTable-scan tests', testIf(() => {
    describe('The makeVersionSet function', () => {
        it('normally returns an object with ids and versions', () => {
            const response = scan.makeVersionSet(batchList);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array').and.have.lengthOf(1);
            expect(response.receipts[0]).to.have.property('version');
        });
        it('returns an error if 1 of the records has no latestState', () => {
            const corruptBatchList = [...batchList, { id: '4567' }];
            const response = scan.makeVersionSet(corruptBatchList);
            expect(response).to.have.property('error');
        });
    });

    describe('The queryVersions function', () => {
        it('normally returns an object with array for receipts and purchase invoices', async () => {
            const response = await scan.queryVersions(context);
            expect(response).to.have.property('LastEvaluatedKey');
            const items = response.items;
            expect(items).to.have.property('receipts');
            expect(items.receipts).to.be.an('array');
        });
    });
}));
