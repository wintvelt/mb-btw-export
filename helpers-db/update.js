// helpers-db/update.js
// to fiddle with DynamoDB

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.promise = ({ id, latest_state }, { tableName }) => {
    const params = {
        TableName: tableName,
        Key: {
            id,
        },
        ExpressionAttributeNames: {
            '#ls': 'latest_state',
        },
        ExpressionAttributeValues: {
            ':latest_state': latest_state,
        },
        UpdateExpression: 'SET #ls = :latest_state',
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(params)
        .promise()
        .catch(error => ({ error: error.message }));
};