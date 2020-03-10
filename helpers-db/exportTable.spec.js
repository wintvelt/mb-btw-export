// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const exportTable = require('./exportTable');
const exportTableItem = require('./exportTable-item');

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
const neverExportedDeletedRecord = {
    adminCode, id: '1238',
    latestState: { isDeleted: true }
};
const docRecords = [newChangedStateRecord, newUnchangedStateRecord, newDeletedStateRecord, neverExportedDeletedRecord];

describe('Dynamo DB exportTable tests', () => {
    describe('The makeUnexported function', () => {
        it('prepares parameters for udpate correctly', () => {
            const result = exportTable.makeUnexported(docRecords);
            const updExpr = 'SET #docIdToSet0 = :newState0, #docIdToSet1 = :newState1 REMOVE #docIdToDel0, #docIdToDel1';
            expect(result.UpdateExpression).to.equal(updExpr);
            const names = result.ExpressionAttributeNames;
            expect(names['#docIdToSet0']).to.equal('1234');
            expect(names['#docIdToSet1']).to.equal('1236');
            expect(names['#docIdToDel0']).to.equal('1235');
            expect(names['#docIdToDel1']).to.equal('1238');
            const newState1 = result.ExpressionAttributeValues[':newState1'];
            expect(newState1.latestState).to.have.property('isDeleted');
        });
    });

    describe('The updateUnexported function', testIf(() => {
        before(async () => {
            await exportTableItem.updateSingleUnexported(recordBefore, context);
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
        it('Does 1 update of the unexported item in the exports table', async () => {
            const result = await exportTable.updateUnexported(docRecords, context);
            const newRecord = result.Attributes;
            expect(newRecord).to.have.property('1234');
            expect(newRecord).to.have.property('1236');
            expect(newRecord['1236'].latestState).to.have.property('isDeleted');
        });
    }));
});
