// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const update = require('./update');
const scan = require('./scan');
const updateAll = require('./update-all');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const unExported = {
    id: 'unExported',
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const context = { TableName: testEnv.DYNAMODB_TABLE_DOCS }
const params = { id: '1234', exportStates: [unExported] }
const moreParams = { id: '1235', exportStates: [{ ...unExported, type: 'purchase_invoice' }] }
const evenMoreParams = { id: '1236', exportStates: [{ ...unExported, isDeleted: true }] };
const batchList = [params, moreParams, evenMoreParams];

describe('Dynamo DB tests', () => {
    after(async () => {
        await dynamoDb.delete({ ...context, Key: { id: '1234' } })
            .promise()
            .catch(error => ({ error: error.message }));
        await dynamoDb.delete({ ...context, Key: { id: '1235' } })
            .promise()
            .catch(error => ({ error: error.message }));
        await dynamoDb.delete({ ...context, Key: { id: '1236' } })
            .promise()
            .catch(error => ({ error: error.message }));
    })

    describe('The update.promise function', () => {
        it('stores items on DynamoDB', async () => {
            const response = await update.promise(params, context);
            const moreResponse = await update.promise(moreParams, context);
            const { Attributes } = response;
            expect(response).to.have.property('Attributes');
            expect(Attributes).to.have.property('exportStates');
            expect(Attributes.exportStates[0]).to.have.property('type');
            expect(Attributes.exportStates[0].type).to.equal('receipt');
        });
        it('throws error if tablename is wrong', async () => {
            const response = await update.promise(params, { tableName: 'wrong' });
            expect(response).to.have.property('error');
        });
    });

    describe('The updateAll.promise function', () => {
        it('stores items on dynamoDB', async () => {
            const response = await updateAll.promise(batchList, context);
            expect(response).to.be.an('array');
        });
        it('throws error if one of the updates fails', async () => {
            const wrongBatchList = [...batchList, {}];
            const response = await updateAll.promise(wrongBatchList, context);
            expect(response).to.have.property('error');
        });
    });

    describe('The scan.scan function', () => {
        it('retrieves items from dynamoDB', async () => {
            const response = await scan.scan(context);
            expect(response).to.have.property('Items');
            expect(response.Items).to.be.an('array');
        });
    });

    describe('The scan.scanVersions function', () => {
        it('returns an array', async () => {
            const response = await scan.scanVersions(context);
            expect(response).to.be.an('array');
        })
    });

    describe('The scan.makeVersionSet function', () => {
        it('normally returns an object with ids and versions', () => {
            const response = scan.makeVersionSet(batchList);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array').and.have.lengthOf(1);
            expect(response.receipts[0]).to.have.property('version');
        });
        it('returns an error if 1 of the records has no exportStates', () => {
            const corruptBatchList = [...batchList, { id: '4567' }];
            const response = scan.makeVersionSet(corruptBatchList);
            expect(response).to.have.property('error');
        });
    });

    describe('The scan.scanDbVersions function', () => {
        it('normally returns an object with array for receipts and purchase invoices', async () => {
            const response = await scan.scanDbVersions(context);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array');
        });
    });
});
