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
    ProjectionExpression: "id, exports",
};

const scanVersionsOnce = ({ TableName }, ExclusiveStartKey) => {
    const params = {
        ...scanVersionsParams,
        TableName,
        ExclusiveStartKey
    };
    return scan(params);
};

module.exports.scanVersions = async ({ TableName }) => {
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