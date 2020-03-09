'use strict';
const sync = require('./helpers-sync/sync');
const docTable = require('./helpers-db/docTable');
const exportTable = require('./helpers-db/exportTable');

const docTableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
const contextDoc = { TableName: docTableName };
const exportTableName = process.env.DYNAMODB_EXPORT_TABLE || 'btw-export-dev-exports';
const contextExport = { TableName: exportTableName };
const maxUpdates = 100;

const response = (statusCode, bodyOrString) => {
    const body = typeof bodyOrString === 'string' ?
        bodyOrString
        : JSON.stringify(bodyOrString, null, 2);
    return {
        statusCode,
        body
    }
}
module.exports.main = async event => {
    const isBadRequest = (!event || !event.pathParameters.admin || !event.headers || !event.headers.Authorization);
    if (isBadRequest) return response(400, "Unauthorized");
    const adminCode = event.pathParameters.admin;
    const params = {
        adminCode,
        access_token: event.headers.Authorization.slice(6),
        TableName: docTableName,
        maxUpdates
    }
    const resultFromDbAndMb = await sync.getDocUpdates(params);
    if (resultFromDbAndMb.error) return response(500, resultFromDbAndMb.error);
    const { docUpdates, maxExceeded } = resultFromDbAndMb;
    const docResults = await Promise.all(docUpdates.map(docUpdate => {
        const params = {
            adminCode,
            id: docUpdate.id,
            state: 'latestState',
            newState: docUpdate.latestState
        }
        return docTable.updateSingle(params, contextDoc);
    }));
    const errorFound = docResults.find(docResult => docResult.error);
    if (errorFound) return response(500, { error: errorFound.error });
    const docRecords = docResults.map(docResult => docResult.Attributes);

    const exportResult = await exportTable.updateUnexported(docRecords, contextExport);
    if (exportResult.error) return response(500, { error: exportResult.error });

    return response(200, { maxExceeded });
};
