// helpers-db/scan.js
// to fiddle with DynamoDB

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.promise = ({ tableName, startKey }) => {
    const params = {
        TableName: tableName,
        ExclusiveStartKey: startKey
    };

    return dynamoDb.scan(params)
        .promise()
        .catch(error => ({ error: error.message }));
};