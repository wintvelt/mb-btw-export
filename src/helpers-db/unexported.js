// helpers-db/unexported.js
// to update the unexported state of 1 doc
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const diff = require('./unexported-diff');
const update = require('./update');
const errorLog = require('../helpers/request').errorLog;

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const getLatestExport = async ({ adminCode, latestExportName, id }) => {
    const params = {
        Key: {
            adminCodeState: adminCode + latestExportName,
            id
        },
        TableName
    }
    return dynamoDb.get(params)
        .promise()
        .then(res => res.Item)
        .catch(error => ({ error: error.message }));
}

const updateUnexported = async (latestState) => {
    const { adminCode, id, state, exportLogs } = latestState;
    const latestExportName = exportLogs && exportLogs.length > 0 && exportLogs[0];
    const latestExport = latestExportName && await getLatestExport({ adminCode, latestExportName, id });
    const latestExportState = latestExport && latestExport.state;

    const latestDiff = diff.diff(latestExportState, state);
    const shouldBeInUnexported = (latestDiff.length > 0);
    const latestExportFacts = {
        type: latestExportState && latestExportState.type,
        date: latestExportState && latestExportState.date,
        company: latestExportState && latestExportState.company,
        country: latestExportState && latestExportState.country,
    };
    const deleteParams = {
        TableName,
        Key: {
            adminCodeState: adminCode + 'unexported',
            id,
        },
        ReturnValues: 'NONE'
    };
    const itemUpdates = [
        { itemName: 'state', newState: { ...latestExportFacts, ...state } },
        { itemName: 'diff', newState: latestDiff },
        { itemName: 'exportLogs', newState: exportLogs || [] },
    ];

    return (shouldBeInUnexported) ?
        update.singleWithItems({ adminCode, id, stateName: 'unexported', itemUpdates })
        : dynamoDb.delete(deleteParams)
            .promise()
            .catch(error => errorLog('could not delete unexported', { error: error.message }));
};
module.exports.updateUnexported = updateUnexported;

module.exports.removeUnexported = ({ adminCode, id }) => {
    return dynamoDb.delete({
        Key: {
            adminCodeState: adminCode + 'unexported',
            id
        },
        TableName,
        ReturnValues: 'NONE'
    })
        .promise()
        .catch(error => ({ error: error.message }));
}