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

const updateUnexportedParams = async (latestState) => {
    const { adminCode, id, state, exportLogs, timeStamp } = latestState;
    const latestExportName = exportLogs && exportLogs.length > 0 && exportLogs[0];
    const latestExport = latestExportName && await getLatestExport({ adminCode, latestExportName, id });
    if (latestExport && latestExport.error) {
        return errorLog(`Failed to get state of export ${latestExportName}`, latestExport);
    };
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
        { itemName: 'timeStamp', newState: timeStamp },
        { itemName: 'state', newState: { ...latestExportFacts, ...state } },
        { itemName: 'diff', newState: latestDiff },
        { itemName: 'exportLogs', newState: exportLogs || [] },
    ];

    return (shouldBeInUnexported) ?
        update.singleWithItemsParams({ adminCode, id, stateName: 'unexported', itemUpdates })
        : { Delete: deleteParams };
};
module.exports.updateUnexportedParams = updateUnexportedParams;

module.exports.updateUnexported = async (latestState) => {
    const params = await updateUnexportedParams(latestState);
    if (params.error) {
        return errorLog('Failed to create update parameters for unexported', params);
    };

    return (params.Update) ?
        dynamoDb.update(params.Update)
            .promise()
            .then(res => res.Attributes)
            .catch(error => errorLog('could not update unexported', { error: error.message }))
        : dynamoDb.delete(params.Delete)
            .promise()
            .catch(error => errorLog('could not delete unexported', { error: error.message }));

}

module.exports.removeUnexportedParams = ({ adminCode, id }) => {
    return {
        Delete: {
            Key: {
                adminCodeState: adminCode + 'unexported',
                id
            },
            TableName,
            ReturnValues: 'NONE'
        }
    }
    s
}