// helpers-db/scan.js
// to fiddle with DynamoDB

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const query = (params) => {
    return dynamoDb.query(params)
        .promise()
        .catch(error => ({ error: error.message }));
};

const queryVersionsParams = {
    ProjectionExpression: "adminCode, id, latestState",
    KeyConditionExpression: '#adminCode = :adminCode',
    ExpressionAttributeNames: {
        '#adminCode': 'adminCode'
    },
};

const queryVersionsOnce = ({ adminCode, TableName }, ExclusiveStartKey) => {
    const params = {
        ...queryVersionsParams,
        ExpressionAttributeValues: {
            ':adminCode': adminCode
        },
        TableName,
        ExclusiveStartKey
    };
    return query(params);
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

module.exports.queryVersions = async ({ adminCode, TableName, ExclusiveStartKey }) => {
    const dbLatest = await queryVersionsOnce({ adminCode, TableName, ExclusiveStartKey });
    return {
        items: makeVersionSet(dbLatest.Items),
        LastEvaluatedKey: dbLatest.LastEvaluatedKey
    }
}