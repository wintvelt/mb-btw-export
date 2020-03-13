// helpers-db/docTable.js
// to read/write DynamoDB docTable
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const updateSingle = ({ adminCode, id, stateName, itemName, newState }) => {
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
module.exports.updateSingle = updateSingle;

module.exports.addExport = ({ latestState, exportName }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs) ?
        [exportName, ...exportLogs]
        : [exportName];
    const params = {
        adminCode,
        id, 
        stateName: 'latestState', 
        itemName: 'exportLogs', 
        newState: newExportLogs
    };
    return updateSingle(params);
};

module.exports.removeExport = ({ latestState }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs) ?
        exportLogs.slice(1)
        : [];
    const params = {
        adminCode,
        id, 
        stateName: 'latestState', 
        itemName: 'exportLogs', 
        newState: newExportLogs
    };
    return updateSingle(params);
};