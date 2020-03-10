// helpers-db/exportTable-export.js
// to read/write DynamoDB exportTable
// for a) retrieving ids to be exported and b) to save a created selection to an export state
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const exporTableDiff = require('./exportTable-diff');

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const filterDate = (start_date, end_date) => (item) => {
    const { latestState } = item;
    return (!start_date || latestState.date >= start_date)
        && (!end_date || latestState.end_date <= end_date)
}

const doubleStr = (num) => (
    (num < 10) ? '0' + num : '' + num
)

const dateStr = (date) => (
    date.getFullYear() + '-' + doubleStr(date.getMonth() + 1) + '-' + doubleStr(date.getDate())
)

module.exports.getDocsToExport = async ({ adminCode, start_date, end_date, is_full_report = false, TableName }) => {
    const getExportParams = {
        TableName,
        Key: { adminCode, state: 'unexported' }
    }
    const fetchedExport = await dynamoDb.get(getExportParams)
        .promise()
        .catch(error => ({ error: error.message }));;
    if (fetchedExport.error) return { error: fetchedExport.error };
    const unexportedDocObj = fetchedExport.Item;
    const unexportedDocs = Object.keys(unexportedDocObj)
        .filter(key => key !== 'adminCode' && key !== 'state')
        .map(id => ({ id, ...unexportedDocObj[id]}));
    const now = new Date();
    const nowStr = dateStr(now);
    const safeStartDate = start_date || nowStr.slice(0, 4) + '-01-01';
    const filteredDocs = unexportedDocs.filter(filterDate(safeStartDate, end_date));
    return filteredDocs.map((doc) => ({
        id: doc.id,
        type: doc.latestState.type,
        exportState: (is_full_report)? 
            exporTableDiff.diff(null, doc.latestState)
            : doc.latestStateDiff
    }));
}

