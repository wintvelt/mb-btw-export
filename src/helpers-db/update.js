// helpers-db/update.js
// to update a single DynamoDB record
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const removeEmptyStrings = (obj) => {
    let outObj = {}
    Object.keys(obj).forEach(key => {
        if (obj[key] !== '') outObj[key] = obj[key];
    })
    return outObj;
}

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
            ':ns': removeEmptyStrings(newState)
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

const singleWithItems = ({ adminCode, id, stateName, itemUpdates }) => {
    let ExpressionAttributeNames = {
        '#ac': 'adminCode',
        '#sn': 'stateName'
    }
    let ExpressionAttributeValues = {
        ':ac': adminCode,
        ':sn': stateName
    };
    let UpdateExpression = 'SET #ac = :ac, #sn = :sn';
    for (let i = 0; i < itemUpdates.length; i++) {
        const itemUpdate = itemUpdates[i];
        ExpressionAttributeNames['#it' + i] = itemUpdate.itemName;
        ExpressionAttributeValues[':ns' + i] = itemUpdate.newState;
        UpdateExpression = UpdateExpression + `, #it${i} = :ns${i}`;
    }
    const params = {
        TableName,
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        },
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        UpdateExpression,
        ReturnValues: 'ALL_NEW',
    };

    return dynamoDb.update(params)
        .promise()
        .then(res => res.Attributes)
        .catch(error => ({ error: error.message }));
};
module.exports.singleWithItems = singleWithItems;

module.exports.delete = ({ adminCode, id, stateName }) => {
    const params = {
        TableName,
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        },
        ReturnValues: 'NONE',
    };

    return dynamoDb.delete(params)
        .promise()
        .catch(error => ({ error: error.message }));
};