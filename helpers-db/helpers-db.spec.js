// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const update = require('./update');
const scan = require('./scan');
const updateAll = require('./update-all');

const testEnv = {
    DYNAMODB_TABLE: 'btw-export-dev'
};

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

describe('Dynamo DB tests', () => {
    const latest_state = {
        type: 'receipt',
        version: 12345,
        date: '2020-01-08'
    }
    const context = { TableName: testEnv.DYNAMODB_TABLE }
    const params = { id: '1234', latest_state }
    const moreParams = { id: '1235', latest_state: { ...latest_state, type: 'purchase_invoice' } }
    const evenMoreParams = { id: '1236', latest_state: { isDeleted: true } };
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
            const moreResponse = update.promise(moreParams, context);
            const { Attributes } = response;
            expect(response).to.have.property('Attributes');
            expect(Attributes).to.have.property('id');
            expect(Attributes.latest_state).to.have.property('type');
            expect(Attributes.latest_state.type).to.equal('receipt');
        });
        it('throws error if tablename is wrong', async () => {
            const response = await update.promise(params, { tableName: 'wrong' });
            expect(response).to.have.property('error');
        });
    });

    describe('The scan.promise function', () => {
        it('retrieves 2 items from dynamoDB', async () => {
            const response = await scan.promise(context);
            expect(response).to.have.property('Items');
            expect(response.Items).to.have.lengthOf(2);
        });
    });

    describe('The updateAll.promise function', () => {
        it('stores items on dynamoDB', async () => {
            const response = await updateAll.promise(batchList, context);
            expect(response).to.be.an('array').and.have.lengthOf(3);
        });
        it('throws error if one of the updates fails', async () => {
            const wrongBatchList = [...batchList, {}];
            const response = await updateAll.promise(wrongBatchList, context);
            expect(response).to.have.property('error');
        });
    });
});
