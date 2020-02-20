// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const update = require('./update');
const scan = require('./scan');

const testEnv = {
    DYNAMODB_TABLE: 'btw-export-dev'
};

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

describe('Dynamo DB tests', () => {
    after(async () => {
        const params = { TableName: testEnv.DYNAMODB_TABLE }
        await dynamoDb.delete({ ...params, Key: { id: '1234' } })
            .promise()
            .catch(error => ({ error: error.message }));
        await dynamoDb.delete({ ...params, Key: { id: '1235' } })
            .promise()
            .catch(error => ({ error: error.message }));
    })

    describe('The update.promise function', () => {
        const context = { tableName: testEnv.DYNAMODB_TABLE }
        const latest_state = {
            type: 'receipt',
            version: 12345,
            date: '2020-01-08'
        }
        const params = { id: '1234', latest_state }
        const moreParams = { id: '1235', latest_state: { ...latest_state, type: 'purchase_invoice' } }
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
        const params = { tableName: testEnv.DYNAMODB_TABLE }
        it('retrieves 2 items from dynamoDB', async () => {
            const response = await scan.promise(params);
            expect(response).to.have.property('Items');
            expect(response.Items).to.have.lengthOf(2);
        });
    });
});
