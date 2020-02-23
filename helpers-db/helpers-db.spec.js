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

describe('Dynamo DB tests', () => {
    const unExported = {
        id: 'unExported',
        type: 'receipt',
        version: 12345,
        date: '2020-01-08'
    };
    const context = { TableName: testEnv.DYNAMODB_TABLE_DOCS }
    const params = { id: '1234', exportStates: [unExported] }
    const moreParams = { id: '1235', exportStates: [{ ...unExported, type: 'purchase_invoice' }] }
    const evenMoreParams = { id: '1236', exportStates: [{ id: 'unExported', isDeleted: true }] };
    const batchList = [params, moreParams, evenMoreParams];

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
            expect(Attributes.exportStates).to.be.an('array');
            expect(Attributes.exportStates[0]).to.have.property('type');
            expect(Attributes.exportStates[0].type).to.equal('receipt');
        });
        it('throws error if tablename is wrong', async () => {
            const response = await update.promise(params, { tableName: 'wrong' });
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
            const response = await scan.scanVersions(context)
        })
    })

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
});
