'use strict';
const dbUpdates = require('./helpers-db/updateSingle');
const mbHelpers = require('./helpers-mb/fetchDocs');
const stripRecord = mbHelpers.stripRecord;

const response = (statusCode, bodyOrString) => {
    const body = typeof bodyOrString === 'string' ?
        bodyOrString
        : JSON.stringify(bodyOrString, null, 2);
    return {
        statusCode,
        body
    }
}

const context = {
    docTableName: process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs',
    exportTableName: process.env.DYNAMODB_EXPORT_TABLE || 'btw-export-dev-docs',
}

module.exports.main = async event => {
    // get params from event
    if (!event || !event.pathParameters) return response(404, "Not found");
    const { admin } = event.pathParameters;
    const adminCode = admin;
    if (!event.body) return response(400, "Bad request");
    let bodyObj;
    try {
        bodyObj = JSON.parse(event.body);
    } catch (_) {
        bodyObj = event.body;
    }
    console.log({ requestBody: bodyObj });
    const tokenError = (!bodyObj.webhook_token || bodyObj.webhook_token !== process.env.MB_WEBHOOK_TOKEN);
    if (process.env.MB_WEBHOOK_TOKEN && tokenError) return response(400, "Bad request");
    const entity = bodyObj.entity;
    if (!entity || !bodyObj.webhook_token) return response(200, "OK");
    const type = bodyObj.entity_type && bodyObj.entity_type.toLowerCase();
    const record = stripRecord(type)(entity);
    const params = {
        adminCode,
        id: record.id,
        latestState: record.latestState,
        ...context
    }
    const updateResponse = await dbUpdates.updateSingle(params);
    if (updateResponse.error) return response(500, "Error");
    return response(200, "OK");
}