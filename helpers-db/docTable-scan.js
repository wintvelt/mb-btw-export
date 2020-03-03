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
    ProjectionExpression: "id, latestState",
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
        const latestState = item.latestState;
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

module.exports.scanVersions = async ({ TableName, ExclusiveStartKey }) => {
    const dbLatest = await scanVersionsOnce({ TableName, ExclusiveStartKey });
    return {
        items: makeVersionSet(dbLatest.Items),
        LastEvaluatedKey: dbLatest.LastEvaluatedKey
    }
}