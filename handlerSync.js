'use strict';
const sync = require('./helpers-sync/sync');
const dbUpdate = require('./helpers-db/updateSingle');

const docTableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
const exportTableName = process.env.DYNAMODB_EXPORT_TABLE || 'btw-export-dev-exports';
const maxUpdates = 50;

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
    const result = await sync.getDocUpdates(params);
    if (result.error) return response(500, result.error);
    const { docUpdates, maxExceeded } = result;
    const docUpdatesCount = docUpdates.length;
    let docResult;
    for (let i = 0; i < docUpdatesCount; i++) {
        const docUpdate = docUpdates[i];
        const docParams = {
            adminCode,
            id: docUpdate.id,
            latestState: docUpdate.latestState,
            docTableName,
            exportTableName
        }
        docResult = await dbUpdate.updateSingle(docParams);
        if (docResult.error) break;
    }
    if (docResult.error) return response(500, docResult.error);
    return response(200, { maxExceeded });
};
