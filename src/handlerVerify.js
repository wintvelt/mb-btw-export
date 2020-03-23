'use strict';
const request = require('./helpers/request');
const query = require('./helpers-db/query');
const get = require('./helpers-db/get');
const diff = require('./helpers-db/unexported-diff');

const maxItemsToVerify = 50;

module.exports.main = async event => {
    const isBadRequest = (!event || !event.pathParameters.admin ||
        !event.headers || !event.headers.Authorization || !event.body);
    if (isBadRequest) return request.response(401, "Unauthorized");
    const adminCode = event.pathParameters.admin;
    const access_token = event.headers.Authorization.slice(6);

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        body = event.body;
    }

    const { ExclusiveStartKey } = body;

    const latestStateResult = await query.queryOnce({
        adminCode,
        stateName: 'latestState',
        ExclusiveStartKey,
        Limit: maxItemsToVerify,
    });
    if (latestStateResult.error) return request.response(500, latestStateResult.error);

    const { Items, Count, LastEvaluatedKey } = latestStateResult;
    let issues = [];
    const itemsLength = Items.length;
    for (let i = 0; i < itemsLength; i++) {
        const item = Items[i];
        const exportNames = item.exportLogs || [];
        let exports = await Promise.all(exportNames.map((name) => {
            get.get({
                adminCode,
                id: item.id,
                stateName: name
            });
        }));
        exports = exports.filter(name => !!name);
        const unexported = await get.get({
            adminCode,
            id: item.id,
            stateName: 'unexported'
        });
        if (unexported) exports = [unexported, ...exports];
        exports = [{ stateName: 'latestState', previousState: item.state }, ...exports];
        for (let i = 1; i < exports.length; i++) {
            const current = exports[i];
            const previous = exports[i-1];
            const diffCheck = diff.diff(previous.previousState, current.state);
            if (diffCheck.length > 0) {
                issues.push({
                    id: item.id,
                    stateName: current.stateName,
                    diffCheck: diffCheck,
                    current: current.state,
                    previous: previous.previousState
                });
            }
        }
    }

    return request.response(201, {
        verified: Count,
        issues,
        LastEvaluatedKey
    });
};
