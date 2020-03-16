'use strict';
const sync = require('./helpers-sync/sync');
const update = require('./helpers-db/update');
const unexported = require('./helpers-db/unexported');

const docTableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
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
    console.log(event);
    const resultFromDbAndMb = await sync.getDocUpdates(params);
    if (resultFromDbAndMb.error) return response(500, resultFromDbAndMb.error);
    const { docUpdates, maxExceeded } = resultFromDbAndMb;

    const results = await Promise.all(docUpdates.map(docUpdate => {
        const params = {
            adminCode,
            id: docUpdate.id,
            stateName: 'latestState',
            itemName: 'state',
            newState: docUpdate.latestState
        }
        return update.single(params)
            .then(latestState => {
                return unexported.updateUnexported(latestState);
            });
    }));
    const errorFound = results.find(res => res.error);
    if (errorFound) {
        console.log(errorFound);
        return response(500, { error: errorFound.error });
    }

    return response(200, { maxExceeded });
};
