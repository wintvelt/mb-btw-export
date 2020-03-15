'use strict';
const update = require('./helpers-db/update');
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
    const state = (bodyObj.action === 'document_updated') ?
        stripRecord(type)(entity).latestState
        : { isDeleted: true };
    const params = {
        adminCode,
        id: record.id,
        stateName: 'latestState',
        itemName: 'state',
        newState: state,
    }
    const latestState = await update.updateSingle(params);
    if (latestState.error) return response(500, "Error");
    const unexportedResult = await unexported.updateUnexported(latestState);
    if (unexportedResult.error) return response(500, "Error");

    return response(200, "OK");
}