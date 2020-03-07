// helpers-db/exportTable.js
// to read/write DynamoDB exportTable

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.updateSingleUnexported = (docRecord, { TableName }) => {
    const allExportKeys = Object.keys(docRecord).filter(key => (
        key !== 'id' && key !== 'latestState' && key !== 'adminCode'
    ));
    let latestExportHash;
    let latestExportVersion;
    let latestExportFacts;
    for (let i = 0; i < allExportKeys.length; i++) {
        const key = allExportKeys[i];
        const state = docRecord[key];
        if (!latestExportVersion || state.isDeleted || state.version > latestExportVersion) {
            latestExportHash = JSON.stringify({
                type: state.type,
                details: state.details,
                isDeleted: state.isDeleted,
            });
            latestExportFacts = {
                type: state.type,
                date: state.date,
                isDeleted: state.isDeleted
            }
            latestExportVersion = state.version;
        }
        if (state.isDeleted) break;
    }
    const latestHash = JSON.stringify({
        type: docRecord.latestState.type,
        details: docRecord.latestState.details,
        isDeleted: docRecord.latestState.isDeleted,
    });
    const deletedWasExported = (docRecord.latestState.isDeleted && latestExportFacts && latestExportFacts.isDeleted);
    const deletedNeverExported = (docRecord.latestState.isDeleted && !latestExportFacts);
    const isUnexported = (!deletedWasExported && latestHash !== latestExportHash);
    const shouldBeInUnexported = (isUnexported && !deletedNeverExported);
    const updateOperation = (shouldBeInUnexported) ?
        'SET #docId = :newState'
        : 'REMOVE #docId';

    const unexportedParams = {
        TableName,
        Key: {
            adminCode: docRecord.adminCode,
            state: 'unexported',
        },
        UpdateExpression: updateOperation,
        ExpressionAttributeNames: {
            '#docId': docRecord.id,
        },
        ExpressionAttributeValues: (shouldBeInUnexported) ?
            {
                ':newState': { ...latestExportFacts, ...docRecord.latestState },
            } : null,
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(unexportedParams)
        .promise()
        .catch(error => ({ error: error.message }));
};