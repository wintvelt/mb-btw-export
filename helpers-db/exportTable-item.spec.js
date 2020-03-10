// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const exportTable = require('./exportTable-item');

const testEnv = {
    DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
    DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
};
const adminCode = process.env.ADMIN_CODE;

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

const baseDetails = {
    id: '1',
    total_price_excl_tax_with_discount_base: '123.45',
    tax_rate_id: '45676',
    ledger_account_id: '10'
};
const context = { TableName: testEnv.DYNAMODB_TABLE_EXPORTS }
const newChangedStateRecord = {
    adminCode, id: '1234',
    latestState: { type: 'receipt', date: '2020-01-08', version: 12, details: [{ ...baseDetails, tax_rate_id: '0' }] },
    testExport1: { type: 'receipt', date: '2020-01-08', version: 10, details: [baseDetails] }
};
const recordBefore = {
    adminCode, id: '1235',
    latestState: { type: 'receipt', date: '2020-01-08', version: 13, details: [baseDetails] },
    testExport2: { type: 'receipt', date: '2020-01-08', version: 10, details: [{ ...baseDetails, tax_rate_id: '0' }] },
};
const newUnchangedStateRecord = {
    adminCode, id: '1235',
    latestState: { type: 'receipt', date: '2020-01-08', version: 14, details: [baseDetails] },
    testExport1: { type: 'receipt', date: '2020-01-08', version: 13, details: [baseDetails] },
    testExport2: { type: 'receipt', date: '2020-01-08', version: 10, details: [{ ...baseDetails, tax_rate_id: '0' }] },
};
const newDeletedStateRecord = {
    adminCode, id: '1236',
    latestState: { isDeleted: true },
    testExport1: { type: 'receipt', date: '2020-01-08', version: 10, details: [baseDetails] }
};
const otherRecordBefore = {
    adminCode, id: '1237',
    latestState: { type: 'receipt', date: '2020-01-08', isDeleted: true }
};
const newUnchangedDeletedStateRecord = {
    adminCode, id: '1237',
    latestState: { isDeleted: true },
    testExport1: { type: 'receipt', date: '2020-01-08', version: 10, details: [baseDetails] },
    testExport2: { type: 'receipt', date: '2020-01-08', isDeleted: true }
};
const neverExportedDeletedRecord = {
    adminCode, id: '1238',
    latestState: { isDeleted: true }
};

describe('Dynamo DB exportTable-item tests', testIf(() => {
    describe('The updateSingleUnexported function', () => {
        before(async () => {
            await Promise.all([
                exportTable.updateSingleUnexported(recordBefore, context),
                exportTable.updateSingleUnexported(otherRecordBefore, context),
            ]);
        });
        after(async () => {
            const params = {
                TableName: testEnv.DYNAMODB_TABLE_EXPORTS,
                Key: {
                    adminCode,
                    state: 'unexported',
                },
                ExpressionAttributeNames: {
                    '#id1': '1234',
                    '#id2': '1236',
                },        
                UpdateExpression: 'REMOVE #id1, #id2',
                ReturnValues: 'ALL_NEW',
            };

            // update the database
            await dynamoDb.update(params)
                .promise()
                .catch(error => ({ error: error.message }));
        });
        it('adds docId to unexported list if the latestState is unexported', async () => {
            const result = await exportTable.updateSingleUnexported(newChangedStateRecord, context);
            const newItem = result.Attributes;
            expect(newItem.state).to.equal('unexported');
            expect(newItem).to.have.property('1234');
        });
        it('removes docId from unexported list if the latestState is same as last export', async () => {
            const result = await exportTable.updateSingleUnexported(newUnchangedStateRecord, context);
            const newItem = result.Attributes;
            expect(newItem).to.not.have.property('1235');
        });
        it('adds docId to unexported list with state isDeleted if the latestState is deleted', async () => {
            const result = await exportTable.updateSingleUnexported(newDeletedStateRecord, context);
            const newItem = result.Attributes;
            expect(newItem).to.have.property('1236');
            expect(newItem['1236'].latestState).to.have.property('isDeleted');
        });
        it('removes docId from unexported list if the latestState is deleted and last export also', async () => {
            const result = await exportTable.updateSingleUnexported(newUnchangedDeletedStateRecord, context);
            const newItem = result.Attributes;
            expect(newItem).to.not.have.property('1237');
        });
        it('removes docId from unexported list if the latestState is deleted and never exported', async () => {
            const result = await exportTable.updateSingleUnexported(neverExportedDeletedRecord, context);
            const newItem = result.Attributes;
            expect(newItem).to.not.have.property('1238');
        });
    });
}));
