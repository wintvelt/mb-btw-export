'use strict';
const latestState = require('./helpers-db/latestState');
const mbHelpers = require('./helpers-mb/fetchDocs');
const stripRecord = mbHelpers.stripRecord;
const request = require('./helpers/request');

module.exports.main = async event => {
    // get params from event
    if (!event || !event.pathParameters) return response(404, "Not found");
    const { admin } = event.pathParameters;
    const adminCode = admin;
    if (!event.body) return request.response(400, "Bad request");
    let bodyObj;
    try {
        bodyObj = JSON.parse(event.body);
    } catch (_) {
        bodyObj = event.body;
    }
    const tokenError = (!bodyObj.webhook_token || bodyObj.webhook_token !== process.env.MB_WEBHOOK_TOKEN);
    if (process.env.MB_WEBHOOK_TOKEN && tokenError) return request.response(400, "Bad request");
    const { entity, entity_type, action, entity_id } = bodyObj;
    const id = entity_id;
    console.log(bodyObj);
    if (action === 'test_webhook') return request.response(200, "OK");
    const type = entity_type && entity_type.toLowerCase();
    const state = (action === 'document_updated' && entity) ?
        stripRecord(type)(entity).latestState
        : { isDeleted: true };

    const newLatestState = {
        adminCode,
        id,
        state,
    };
    const result = await latestState.updateStateAndUnexported({ latestState: newLatestState });

    if (result.error) return request.response(500, "Error");

    return request.response(200, "OK");
}