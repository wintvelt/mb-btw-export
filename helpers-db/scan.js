// helpers-db/scan.js
// to fiddle with DynamoDB

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const scan = (params) => {
    return dynamoDb.scan(params)
        .promise()
        .catch(error => ({ error: error.message }));
};
module.exports.scan = scan;

const scanVersionsParams = {
    ProjectionExpression: "id, exportStates",
};

const scanVersionsOnce = ({ TableName }, ExclusiveStartKey) => {
    const params = {
        ...scanVersionsParams,
        TableName,
        ExclusiveStartKey
    };
    return scan(params);
};

const makeVersionSet = (dbLatest) => {
    const dbLength = dbLatest.length;
    let result = {
        receipts: [],
        purchase_invoices: []
    };
    for (let i = 0; i < dbLength; i++) {
        const item = dbLatest[i];
        const latestState = item.exportStates && item.exportStates[0];
        if (!latestState) {
            result = { error: `Doc database is corrupted at id ${item.id}` }
            break;
        }
        const type = latestState.type + 's';
        if (!latestState.isDeleted) {
            result[type].push({
                id: item.id,
                version: latestState.version
            });
        }
    }
    return result;
}
module.exports.makeVersionSet = makeVersionSet;

const scanVersions = async ({ TableName }) => {
    // let dbLatest = { receipts: [], purchase_invoices: [] };
    let dbLatest = [];
    let shouldDoScan = true;
    let ExclusiveStartKey = undefined;
    while (shouldDoScan) {
        const scanResult = await scanVersionsOnce({ TableName }, ExclusiveStartKey);
        if (scanResult.error) {
            shouldDoScan = false;
            dbLatest = { error: scanResult.error }
        } else {
            dbLatest = [...dbLatest, ...scanResult.Items];
            ExclusiveStartKey = scanResult.LastEvaluatedKey;
            shouldDoScan = !!ExclusiveStartKey;
        }
    }
    return dbLatest;
}
module.exports.scanVersions = scanVersions;

module.exports.scanDbVersions = async ({ TableName }) => {
    const dbLatest = await scanVersions({ TableName });
    return makeVersionSet(dbLatest);
}