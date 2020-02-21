'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const mbHelpers = require('./helpers-mb/fetch');
const stripRecord = mbHelpers.stripRecord;

var s3 = new AWS.S3({
    region: 'eu-central-1'
});

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
    bucket: 'mb-incoming-sync-files',
    filename: 'webhook'
};

const saveFile = ({ bucket, adminCode, filename, body }) => {
    const Key = `${adminCode}/${filename}.json`;
    return s3.putObject({
        Bucket: bucket,
        Key,
        Body: JSON.stringify(body, null, 2),
        ContentType: 'application/json'
    }).promise()
        .catch(error => ({ error: error.message }));
}

module.exports.main = async event => {
    // get params from event
    if (!event || !event.pathParameters) return response(404, "Not found");
    const { admin } = event.pathParameters;
    const adminCode = admin;
    if (!event.body) return response(401, "Missing authorization");
    let bodyObj;
    try {
        bodyObj = JSON.parse(event.body);
    } catch (_) {
        bodyObj = event.body;
    }
    const tokenError = (!bodyObj.webhook_token || bodyObj.webhook_token !== process.env.MB_WEBHOOK_TOKEN);
    if (process.env.MB_WEBHOOK_TOKEN && tokenError) return response(403, "Bad request");
    const entity = bodyObj.entity;
    if (!entity || !bodyObj.webhook_token) return response(200, "OK");
    const type = bodyObj.entity_type && bodyObj.entity_type.toLowerCase();
    const record = stripRecord(type)(entity);
    // save on S3
    const saveParams = {
        ...context,
        adminCode,
        body: record
    }
    const saveResponse = await saveFile(saveParams);
    if (saveResponse.error) return response(500, "Error");
    return response(200, "OK");
}