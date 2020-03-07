// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const docTable = require('./docTable');
// const updateAll = require('./update-all');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};

const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testIf = (testFunc) => {
    if (testDb) return testFunc;
    return () => {
        it('database tests did not run', () => {});
    }
}

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const adminCode = process.env.ADMIN_CODE;
const context = { TableName: testEnv.DYNAMODB_TABLE_DOCS }
const newDocUpdate = { adminCode, id: '1234', state: 'latestState', newState: baseState }
const newDocUpdate2 = { adminCode, id: '1235', state: 'latestState', newState: { ...baseState, type: 'purchase_invoice' } };
const expDocUpdate = { adminCode, id: '1235', state: 'testExport1', newState: { ...baseState, type: 'purchase_invoice' } };
const delDocUpdate = { adminCode, id: '1234', state: 'latestState', newState: { isDeleted: true } };
const stateRemoveUpdate = { adminCode, id: '1235', key: 'testExport1' };

describe('Dynamo DB docTable tests', testIf(() => {
    before(async () => {
        await docTable.updateSingle(newDocUpdate2, context);
    })
    after(async () => {
        await dynamoDb.delete({ ...context, Key: { adminCode, id: '1234' } })
            .promise()
            .catch(error => ({ error: error.message }));
        await dynamoDb.delete({ ...context, Key: { adminCode, id: '1235' } })
            .promise()
            .catch(error => ({ error: error.message }));
    });

    describe('The docTable.updateSingle function', () => {
        it('creates item in docTable for latestState of new doc', async () => {
            const result = await docTable.updateSingle(newDocUpdate, context);
            expect(result.Attributes).to.have.property('id');
        });
        it('retains export history when updating latest state of a doc', async () => {
            const result = await docTable.updateSingle(expDocUpdate, context);
            expect(result.Attributes).to.have.property('latestState');
            expect(result.Attributes).to.have.property('testExport1');
        });
        it('adds deleted latest state when deleting', async () => {
            const result = await docTable.updateSingle(delDocUpdate, context);
            expect(result.Attributes.latestState).to.have.property('isDeleted');
        });
        it('throws error if tablename is wrong', async () => {
            const result = await docTable.updateSingle(delDocUpdate, { TableName: 'wrong table' });
            expect(result).to.have.property('error');
        });
    });

    describe('The docTable.removeState function', () => {
        it('removes the exported state from a single doc', async () => {
            const result = await docTable.removeState(stateRemoveUpdate, context);
            expect(result.Attributes).to.not.have.property('testExport1');
        });
    });


    // describe('The updateAll.promise function', () => {
    //     it('stores items on dynamoDB', async () => {
    //         const response = await updateAll.promise(batchList, context);
    //         expect(response).to.be.an('array');
    //     });
    //     it('throws error if one of the updates fails', async () => {
    //         const wrongBatchList = [...batchList, {}];
    //         const response = await updateAll.promise(wrongBatchList, context);
    //         expect(response).to.have.property('error');
    //     });
    // });
}));
