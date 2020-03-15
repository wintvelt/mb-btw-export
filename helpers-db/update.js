// helpers-db/update.js
// to update a single DynamoDB record
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const single = ({ adminCode, id, stateName, itemName, newState }) => {
    const params = {
        TableName,
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        },
        ExpressionAttributeNames: {
            '#ac': 'adminCode',
            '#sn': 'stateName',
            "#it": itemName
        },
        ExpressionAttributeValues: {
            ':ac': adminCode,
            ':sn': stateName,
            ':ns': newState
        },
        UpdateExpression: 'SET #ac = :ac, #sn = :sn, #it = :ns',
        ReturnValues: 'ALL_NEW',
    };

    return dynamoDb.update(params)
        .promise()
        .then(res => res.Attributes)
        .catch(error => ({ error: error.message }));
};
module.exports.single = single;