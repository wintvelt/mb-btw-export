// helpers-db/updateSingle.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const updateSingle = require('./updateSingle');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const baseDetails = {
    id: '1',
    total_price_excl_tax_with_discount_base: '123.45',
    tax_rate_id: '45676',
    ledger_account_id: '10'
};
const context = {
    docTableName: testEnv.DYNAMODB_TABLE_DOCS,
    exportTableName: testEnv.DYNAMODB_TABLE_EXPORTS
}
const newLatestStateRecord = {
    id: '1234',
    latestState: { type: 'receipt', date: '2020-01-08', version: 13, details: [baseDetails] }
};

describe('Dynamo DB update tests', () => {
    describe('The updateSingle function', () => {
        it('returns a full doc record if the udpate was successful', async () => {
            const result = await updateSingle.updateSingle({
                ...newLatestStateRecord,
                ...context
            });
            expect(result).to.have.property('id');
            expect(result).to.have.property('latestState');
            expect(result.latestState.version).to.equal(13);
        });
        it('updates the doc table with latest state of id', async () => {
            // update the database
            const result = await dynamoDb.delete({
                TableName: testEnv.DYNAMODB_TABLE_DOCS,
                Key: { id: '1234' }
            })
                .promise()
                .catch(error => ({ error: error.message }));
            expect(result).to.be.an('object');
        });
        it('updates the exports table with id in unexported', async () => {
            const params = {
                TableName: testEnv.DYNAMODB_TABLE_EXPORTS,
                Key: {
                    id: 'unexported',
                },
                ExpressionAttributeNames: {
                    '#id1': '1234'
                },
                UpdateExpression: 'REMOVE #id1',
                ReturnValues: 'ALL_NEW',
            };
            const result = await dynamoDb.update(params)
                .promise()
                .catch(error => ({ error: error.message }));
            expect(result.Attributes.id).to.equal('unexported');

        });
    });
});
