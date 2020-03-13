// helpers-db/scan.js
// to fiddle with DynamoDB
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const query = (params) => {
    return dynamoDb.query(params)
        .promise()
        .then(res => res.Items)
        .catch(error => ({ error: error.message }));
};

const queryVersionsParams = {
    ProjectionExpression: "adminCode, stateName, id, #state",
    KeyConditionExpression: '#acs = :acs',
    ExpressionAttributeNames: {
        '#acs': 'adminCodeState',
        '#state': 'state'
    },
};

const queryVersionsOnce = ({ adminCode, stateName, ExclusiveStartKey }) => {
    const params = {
        ...queryVersionsParams,
        ExpressionAttributeValues: {
            ':acs': adminCode + stateName
        },
        TableName,
        ExclusiveStartKey
    };
    return query(params);
};
module.exports.queryVersionsOnce = queryVersionsOnce;

const makeVersionSet = (dbLatest) => {
    const dbLength = dbLatest.length;
    let result = {
        receipts: [],
        purchase_invoices: []
    };
    for (let i = 0; i < dbLength; i++) {
        const item = dbLatest[i];
        const latestState = item.state;
        if (!latestState) {
            result = { error: `Doc database is corrupted at id ${item.id}` }
            break;
        }
        const type = (latestState.type === 'receipt') ? 'receipts' : 'purchase_invoices';
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

module.exports.queryVersions = async ({ adminCode, ExclusiveStartKey }) => {
    const dbLatest = await queryVersionsOnce({ adminCode, stateName: 'latestState', ExclusiveStartKey });
    return {
        items: makeVersionSet(dbLatest),
        LastEvaluatedKey: dbLatest.LastEvaluatedKey
    }
}