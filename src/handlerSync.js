'use strict';
const sync = require('./helpers-sync/sync');
const update = require('./helpers-db/update');
const unexported = require('./helpers-db/unexported');
const request = require('./helpers/request');

const docTableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
const maxUpdates = 50;

module.exports.main = async event => {
    const isBadRequest = (!event || !event.pathParameters.admin || !event.headers || !event.headers.Authorization);
    if (isBadRequest) return request.response(400, "Unauthorized");
    const adminCode = event.pathParameters.admin;
    const access_token = event.headers.Authorization.slice(6);
    const year = (event.queryStringParameters && event.queryStringParameters.year) || new Date().getFullYear();
    const params = {
        adminCode,
        access_token,
        TableName: docTableName,
        maxUpdates,
        year
    }
    const resultFromDbAndMb = await sync.getDocUpdates(params);
    if (resultFromDbAndMb.error) return request.response(500, resultFromDbAndMb.error);
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
                if (!latestState || latestState.state) {
                    console.log('strange error');
                    return { error: 'strange error when updating DB'};
                }
                return unexported.updateUnexported(latestState);
            });
    }));
    const errorFound = results.find(res => res.error);
    if (errorFound) {
        console.log(errorFound);
        return request.response(500, { error: errorFound.error });
    }

    return request.response(200, { maxExceeded });
};
