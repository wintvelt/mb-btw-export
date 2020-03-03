// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const docTable = require('./docTable');
const scan = require('./scan');
// const updateAll = require('./update-all');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const baseState = {
    type: 'receipt',
    version: 12345,
    date: '2020-01-08'
};
const context = { TableName: testEnv.DYNAMODB_TABLE_DOCS }
const newDocUpdate = { id: '1234', key: 'latestState', newState: baseState }
const newDocUpdate2 = { id: '1235', key: 'latestState', newState: { ...baseState, type: 'purchase_invoice' } };
const expDocUpdate = { id: '1235', key: 'testExport1', newState: { ...baseState, type: 'purchase_invoice' } };
const delDocUpdate = { id: '1234', key: 'latestState', newState: { isDeleted: true } };
const stateRemoveUpdate = { id: '1235', key: 'testExport1' };
// const batchList = [params, moreParams, evenMoreParams];

describe('Dynamo DB docTable tests', () => {
    before(async () => {
        await docTable.updateSingle(newDocUpdate2, context);
    })
    after(async () => {
        await dynamoDb.delete({ ...context, Key: { id: '1234' } })
            .promise()
            .catch(error => ({ error: error.message }));
        await dynamoDb.delete({ ...context, Key: { id: '1235' } })
            .promise()
            .catch(error => ({ error: error.message }));
    });

    describe('The docTable.updateSingle function', () => {
        it('creates item in docTable for latestState of new doc', async () => {
            const result = await docTable.updateSingle(newDocUpdate, context);
            console.log(result);
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

    // describe('The scan.scan function', () => {
    //     it('retrieves items from dynamoDB', async () => {
    //         const response = await scan.scan(context);
    //         expect(response).to.have.property('Items');
    //         expect(response.Items).to.be.an('array');
    //     });
    // });

    // describe('The scan.scanVersions function', () => {
    //     it('returns an array', async () => {
    //         const response = await scan.scanVersions(context);
    //         expect(response).to.be.an('array');
    //     })
    // });

    // describe('The scan.makeVersionSet function', () => {
    //     it('normally returns an object with ids and versions', () => {
    //         const response = scan.makeVersionSet(batchList);
    //         expect(response).to.have.property('receipts');
    //         expect(response.receipts).to.be.an('array').and.have.lengthOf(1);
    //         expect(response.receipts[0]).to.have.property('version');
    //     });
    //     it('returns an error if 1 of the records has no exportStates', () => {
    //         const corruptBatchList = [...batchList, { id: '4567' }];
    //         const response = scan.makeVersionSet(corruptBatchList);
    //         expect(response).to.have.property('error');
    //     });
    // });

    // describe('The scan.scanDbVersions function', () => {
    //     it('normally returns an object with array for receipts and purchase invoices', async () => {
    //         const response = await scan.scanDbVersions(context);
    //         expect(response).to.have.property('receipts');
    //         expect(response.receipts).to.be.an('array');
    //     });
    // });
});
