'use strict';
const fullSync = require('./helpers-sync/sync').fullSync;

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
    const isBadRequest = (!event.pathParameters.admin || !event.headers || !event.headers.Authorization);
    if (isBadRequest) return response(401,"Unauthorized");
    const context = {
        adminCode: event.pathParameters.admin,
        access_token: event.headers.Authorization.slice(6)
    }
    const result = await fullSync(context);
    if (result.error) return response(500, result.error);
    return response(200, "OK");
};