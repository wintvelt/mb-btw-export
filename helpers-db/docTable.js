// helpers-db/docTable.js
// to read/write DynamoDB docTable

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.updateSingle = ({ id, key, newState }, { TableName }) => {
    const params = {
        TableName,
        Key: {
            id,
        },
        ExpressionAttributeNames: {
            '#state': key,
        },
        ExpressionAttributeValues: {
            ':newState': newState,
        },
        UpdateExpression: 'SET #state = :newState',
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(params)
        .promise()
        .catch(error => ({ error: error.message }));
};

module.exports.removeState = ({ id, key }, { TableName }) => {
    const params = {
        TableName,
        Key: {
            id,
        },
        ExpressionAttributeNames: {
            '#state': key,
        },
        UpdateExpression: 'REMOVE #state',
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(params)
        .promise()
        .catch(error => ({ error: error.message }));
};