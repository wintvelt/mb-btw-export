'use strict';
const update = require('./helpers-db/update');
const unexported = require('./helpers-db/unexported');
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
    const { entity, entity_type, action, entity_id, webhook_token } = bodyObj;
    const id = entity_id;
    if (!entity || !webhook_token) return response(200, "OK");
    const type = entity_type && entity_type.toLowerCase();
    const state = (action === 'document_updated' && entity) ?
        stripRecord(type)(entity).latestState
        : { isDeleted: true };
    const params = {
        adminCode,
        id,
        stateName: 'latestState',
        itemName: 'state',
        newState: state,
    }
    const latestState = await update.single(params);
    if (latestState.error) return response(500, "Error");
    const unexportedResult = await unexported.updateUnexported(latestState);
    if (unexportedResult.error) return response(500, "Error");

    return response(200, "OK");
}