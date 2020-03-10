// helpers-db/exportTable.js
// to read/write DynamoDB exportTable

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const exportTableDiff = require('./exportTable-diff');

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const makeSingleUnexported = (docRecord) => {
    const latestHash = JSON.stringify({
        type: docRecord.latestState.type,
        details: docRecord.latestState.details,
        isDeleted: docRecord.latestState.isDeleted,
    });
    const latestExportState = exportTableDiff.getLatestExport(docRecord);
    const latestExportHash = (latestExportState) ? JSON.stringify({
        type: latestExportState.type,
        details: latestExportState.details,
        isDeleted: latestExportState.isDeleted,
    }) : null;
    const latestExportFacts = (latestExportState) ? {
        type: latestExportState.type,
        date: latestExportState.date,
        isDeleted: latestExportState.isDeleted
    } : null;
    const deletedWasExported = (docRecord.latestState.isDeleted && latestExportFacts && latestExportFacts.isDeleted);
    const deletedNeverExported = (docRecord.latestState.isDeleted && !latestExportFacts);
    const isUnexported = (!deletedWasExported && latestHash !== latestExportHash);
    const shouldBeInUnexported = (isUnexported && !deletedNeverExported);
    const updateOperation = (shouldBeInUnexported) ? "SET" : "REMOVE";
    const docId = docRecord.id;
    const newState = (shouldBeInUnexported) ?
        { 
            latestState: { ...latestExportFacts, ...docRecord.latestState },
            latestStateDiff: exportTableDiff.diffState(docRecord)
        }
        : null;
    return {
        updateOperation,
        docId,
        newState,
    }
};
module.exports.makeSingleUnexported = makeSingleUnexported;

module.exports.updateSingleUnexported = (docRecord, { TableName }) => {
    const { updateOperation, docId, newState } = makeSingleUnexported(docRecord);

    const unexportedParams = {
        TableName,
        Key: {
            adminCode: docRecord.adminCode,
            state: 'unexported',
        },
        UpdateExpression: (updateOperation === 'SET') ?
            'SET #docId = :newState'
            : 'REMOVE #docId',
        ExpressionAttributeNames: {
            '#docId': docId,
        },
        ExpressionAttributeValues: newState ?
            {
                ':newState': newState,
            } : null,
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(unexportedParams)
        .promise()
        .catch(error => ({ error: error.message }));
};