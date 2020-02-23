// helpers-db/update.js
// to fiddle with DynamoDB

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.promise = ({ id, exportStates }, { TableName }) => {
    const params = {
        TableName,
        Key: {
            id,
        },
        ExpressionAttributeNames: {
            '#es': 'exportStates',
        },
        ExpressionAttributeValues: {
            ':exportStates': exportStates,
        },
        UpdateExpression: 'SET #es = :exportStates',
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(params)
        .promise()
        .catch(error => ({ error: error.message }));
};