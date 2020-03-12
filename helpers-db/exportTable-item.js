// helpers-db/exportTable.js
// to read/write DynamoDB exportTable

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const exportTableDiff = require('./exportTable-diff');

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const makeSingleUnexported = (docRecord) => {
    const latestExport = exportTableDiff.getLatestExport(docRecord);
    const latestDiff = exportTableDiff.diffState(docRecord);
    const shouldBeInUnexported = (latestDiff.length > 0);
    const latestExportFacts = { 
        type: latestExport && latestExport.latestState.type,
        date: latestExport && latestExport.latestState.date,
    }
    const updateOperation = (shouldBeInUnexported) ? "SET" : "REMOVE";
    const docId = docRecord.id;
    const newState = (shouldBeInUnexported) ?
        { 
            latestState: { ...latestExportFacts, ...docRecord.latestState },
            latestDiff
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