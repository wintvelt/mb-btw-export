'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const query = (params) => {
    return dynamoDb.query(params)
        .promise()
        .catch(error => ({ error: error.message }));
};

const queryBaseParams = {
    ProjectionExpression: "adminCode, stateName, id, #state, diff, exportLogs, #ts, previousState",
    KeyConditionExpression: '#acs = :acs',
    ExpressionAttributeNames: {
        '#acs': 'adminCodeState',
        '#state': 'state',
        '#ts': 'timeStamp'
    },
    TableName
};

const queryOnce = ({ adminCode, stateName, ExclusiveStartKey, Limit }) => {
    let params = {
        ...queryBaseParams,
        ExpressionAttributeValues: {
            ':acs': adminCode + stateName,
        },
        ExclusiveStartKey,
    };
    if (Limit) params.Limit = Limit;
    return query(params)
        .then(res => {
            return { ...res, Items: res.Items && res.Items.filter(item => item.id !== 'exportStats') }
        });
};
module.exports.queryOnce = queryOnce;

module.exports.queryStats = ({ adminCode, filename }) => {
    const params = {
        TableName,
        ProjectionExpression: "adminCode, stateName, id, #state",
        KeyConditionExpression: '#acs = :acs and #id = :id',
        ExpressionAttributeNames: {
            '#acs': 'adminCodeState',
            '#state': 'state',
            '#id': 'id'
        },
        ExpressionAttributeValues: {
            ':acs': adminCode + filename,
            ':id': 'exportStats'
        },
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
    const result = await queryOnce({ adminCode, stateName: 'latestState', ExclusiveStartKey });
    if (result.error) return ({ error: result.error });
    const { Items: dbLatest, LastEvaluatedKey } = result;
    return {
        items: makeVersionSet(dbLatest),
        LastEvaluatedKey
    }
}