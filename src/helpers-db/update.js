// helpers-db/update.js
// to update a single DynamoDB record
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const errorLog = require('../helpers/request').errorLog;

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const removeEmptyStrings = (obj) => {
    if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
    let outObj = {}
    Object.keys(obj).forEach(key => {
        if (obj[key] !== '') outObj[key] = obj[key];
    })
    return outObj;
}

const singleWithItemsParams = ({ adminCode, id, stateName, itemUpdates }) => {
    const timeStamp = Date.now();
    let ExpressionAttributeNames = {
        '#ac': 'adminCode',
        '#sn': 'stateName',
        '#ts': 'timeStamp'
    }
    let ExpressionAttributeValues = {
        ':ac': adminCode,
        ':sn': stateName,
        ':ts': timeStamp
    };
    let UpdateExpression = 'SET #ac = :ac, #sn = :sn, #ts = :ts';
    for (let i = 0; i < itemUpdates.length; i++) {
        const itemUpdate = itemUpdates[i];
        ExpressionAttributeNames['#it' + i] = itemUpdate.itemName;
        ExpressionAttributeValues[':ns' + i] = removeEmptyStrings(itemUpdate.newState);
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

    return { Update: params }
};
module.exports.singleWithItemsParams = singleWithItemsParams;

const singleWithItems = ({ adminCode, id, stateName, itemUpdates }) => {
    const params = singleWithItemsParams({ adminCode, id, stateName, itemUpdates });
    return dynamoDb.update(params.Update)
        .promise()
        .then(res => res.Attributes)
        .catch(error => {
            const err = { error: error.message };
            return errorLog(`could not update Db @state ${stateName} @id ${id}`, err);
        });
};
module.exports.singleWithItems = singleWithItems;

const single = ({ adminCode, id, stateName, itemName, newState }) => {
    const itemUpdates = [
        { itemName, newState }
    ];
    return singleWithItems({ adminCode, id, stateName, itemUpdates });
};
module.exports.single = single;

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