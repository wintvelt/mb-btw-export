// helpers-db/exportTable.js
// to read/write DynamoDB exportTable
const itemFuncs = require('./exportTable-item');

'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});


const updateToText = (doc, i) => (
    '#docIdToSet' + i + ' = :newState' + i
)
const removeToText = (docId, i) => (
    '#docIdToDel' + i
)

const makeUnexported = (docRecordList) => {
    let setUpdateList = [];
    let removeUpdateList = [];
    const docListLength = docRecordList.length;
    for (let i = 0; i < docListLength; i++) {
        const docRecord = docRecordList[i];
        const { updateOperation, docId, newState } = itemFuncs.makeSingleUnexported(docRecord);
        if (updateOperation === 'SET') {
            setUpdateList.push({ docId, newState });
        } else {
            removeUpdateList.push(docId);
        }
    }
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};
    const setListLength = setUpdateList.length;
    for (let i = 0; i < setListLength; i++) {
        const setUpdate = setUpdateList[i];
        ExpressionAttributeNames['#docIdToSet' + i] = setUpdate.docId;
        ExpressionAttributeValues[':newState' + i] = setUpdate.newState;
    }
    const removeListLength = removeUpdateList.length;
    for (let i = 0; i < removeListLength; i++) {
        const idToRemove = removeUpdateList[i];
        ExpressionAttributeNames['#docIdToDel' + i] = idToRemove;
    }
    const setUpdateExpression = 'SET ' + setUpdateList.map(updateToText).join(', ');
    const removeUpdateExpression = 'REMOVE ' + removeUpdateList.map(removeToText).join(', ');
    const hasSet = (setListLength > 0);
    const hasRemove = (removeListLength > 0);
    const hasSetAndRemove = (hasSet && hasRemove);
    const UpdateExpression =
        (hasSet ? setUpdateExpression : '') +
        (hasSetAndRemove ? ' ' : '') +
        (hasRemove ? removeUpdateExpression : '');
    return {
        ExpressionAttributeNames,
        ExpressionAttributeValues: (hasSet ? ExpressionAttributeValues : null),
        UpdateExpression
    }
}
module.exports.makeUnexported = makeUnexported;

module.exports.updateUnexported = (docRecordList, { TableName }) => {
    if (docRecordList.length === 0) return { error: 'empty update list for exports table' };
    const adminCode = docRecordList[0].adminCode;
    const { ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression } =
        makeUnexported(docRecordList);

    const unexportedParams = {
        TableName,
        Key: {
            adminCode: adminCode,
            state: 'unexported',
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(unexportedParams)
        .promise()
        .catch(error => ({ error: error.message }));
}

const makeExport = (docRecordList) => {
    let setUpdateList = [];
    const docListLength = docRecordList.length;
    for (let i = 0; i < docListLength; i++) {
        const docRecord = docRecordList[i];
        const docId = docRecord.id;
        const exportState = { latestState: docRecord.latestState, latestDiff: docRecord.latestDiff };
        setUpdateList.push({ docId, exportState });
    }
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};
    const setListLength = setUpdateList.length;
    for (let i = 0; i < setListLength; i++) {
        const setUpdate = setUpdateList[i];
        ExpressionAttributeNames['#docIdToSet' + i] = setUpdate.docId;
        ExpressionAttributeValues[':newState' + i] = setUpdate.exportState;
    }
    const UpdateExpression = 'SET ' + setUpdateList.map(updateToText).join(', ');
    return {
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        UpdateExpression
    }
}
module.exports.makeExport = makeExport;

module.exports.updateExport = (docRecordList, filename, { TableName }) => {
    if (docRecordList.length === 0) return { error: 'empty update list for exports table' };
    const adminCode = docRecordList[0].adminCode;
    const { ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression } =
        makeExport(docRecordList.slice(0,200));

    const exportParams = {
        TableName,
        Key: {
            adminCode: adminCode,
            state: filename,
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    };
    console.log(UpdateExpression.length);
    // update the database
    return dynamoDb.update(exportParams)
        .promise()
        .catch(error => ({ error: error.message }));
}

const makeRemove = (docRecordList) => {
    const docListLength = docRecordList.length;
    let ExpressionAttributeNames = {};
    for (let i = 0; i < docListLength; i++) {
        const idToRemove = docRecordList[i].id;
        ExpressionAttributeNames['#docIdToDel' + i] = idToRemove;
    }
    const UpdateExpression = 'REMOVE ' + docRecordList.map(removeToText).join(', ');
    return {
        ExpressionAttributeNames,
        UpdateExpression
    }
}
module.exports.makeRemove = makeRemove;

module.exports.removeUnexported = (docRecordList, { TableName }) => {
    if (docRecordList.length === 0) return { error: 'empty update list for exports table' };
    const adminCode = docRecordList[0].adminCode;
    const { ExpressionAttributeNames, UpdateExpression } =
        makeRemove(docRecordList);

    const unexportedParams = {
        TableName,
        Key: {
            adminCode: adminCode,
            state: 'unexported',
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ReturnValues: 'ALL_NEW',
    };

    // update the database
    return dynamoDb.update(unexportedParams)
        .promise()
        .catch(error => ({ error: error.message }));
}