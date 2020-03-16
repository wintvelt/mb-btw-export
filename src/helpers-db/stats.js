'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const deleteExport = require('./deleteExport');
const query = require('./query');

module.exports.getUnexportedStats = async ({ adminCode }) => {
    let unexportedDocs = [];
    let ExclusiveStartKey;
    let queryError;
    do {
        const result = await query.queryOnce({
            adminCode,
            stateName: 'unexported',
            ExclusiveStartKey
        });
        if (result.error) {
            queryError = { error: result.error }
        } else {
            const { Items, LastEvaluatedKey } = result;
            unexportedDocs = [...unexportedDocs, ...Items];
            ExclusiveStartKey = LastEvaluatedKey;
        };
    } while (ExclusiveStartKey && !queryError);
    if (queryError) return queryError;

    const latestExportName = await deleteExport.getLatestExport({ adminCode });
    if (latestExportName.error) return latestExport;

    const latestExportDate = (latestExportName) ?
        latestExportName.slice(11, 21)
        : '';
    let new_docs_after_export_count = 0;
    let new_docs_before_export_count = 0;
    let changed_docs = 0;
    let deleted_docs = 0;
    let start_date;
    let end_date;

    const doc_count = unexportedDocs.length;
    for (let i = 0; i < doc_count; i++) {
        const doc = unexportedDocs[i];
        const docState = doc.state;
        if (!start_date || docState.date < start_date) start_date = docState.date;
        if (!end_date || docState.date > end_date) end_date = docState.date;
        if (docState.exportLogs && docState.exportLogs.length > 0) {
            if (docState.isDeleted) {
                deleted_docs++
            } else {
                changed_docs++
            };
        } else {
            if (latestExportDate && docState.date > latestExportDate) {
                new_docs_after_export_count++
            } else {
                new_docs_before_export_count++
            }
        }
    }

    return {
        new_docs_after_export_count,
        new_docs_before_export_count,
        changed_docs,
        deleted_docs,
        start_date,
        end_date,
        doc_count
    }
}

module.exports.queryExportStats = async ({ adminCode }) => {
    let ExclusiveStartKey;
    let queryError;
    let exportNames = [];
    do {
        const result = await deleteExport.queryIndexOnce({ adminCode, ExclusiveStartKey });
        if (result.error) queryError = { error: result.error };
        const { Items, LastEvaluatedKey } = result;
        ExclusiveStartKey = LastEvaluatedKey;
        exportNames = [...exportNames, ...[...new Set(Items.map(Item => Item.stateName))]];
    } while (ExclusiveStartKey && !queryError);
    if (queryError) return queryError;

    const exportStats = await Promise.all(exportNames.map(stateName => {
        return dynamoDb.get({
            TableName,
            Key: {
                adminCodeState: adminCode + stateName,
                id: 'exportStats'
            },
            ReturnValue: 'ALL_NEW'
        }).promise()
            .then(res => res.Item.state)
            .catch(error => ({ error: error.message }));
    }));
    const errorFound = exportStats.find(exportStat => exportStat.error);
    if (errorFound) return errorFound;
    return exportStats;
}