// helpers-sync/sync.js
// to trigger lambda to sync with moneybird
const fetch = require('node-fetch');
const helpersMb = require('../helpers-mb/fetch');
const fullFetch = helpersMb.fullFetch;
const updateAll = require('../helpers-db/update-all').promise;

const baseUrl = 'https://qix8ox7ufk.execute-api.eu-central-1.amazonaws.com/dev/mb-incoming-sync';
const dbContext = { TableName: 'btw-export-dev' };

const getSync = ({ adminCode, access_token, method = 'GET' }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    const url = `${baseUrl}/${adminCode}`;
    const response = fetch(url, { headers, method })
        .then(res => res.status === 200 ?
            res.json() :
            { error: `${res.status} ${res.statusText}` }
        )
        .catch(error => ({ error: error.message }));
    return response;
}
module.exports.getSync = getSync;

// PS With MB sync on AWS + database update, this function is not included in testscripts
module.exports.fullSync = async ({ adminCode, access_token }) => {
    const changeSet = await getSync({ adminCode, access_token, method: 'POST' });
    if (changeSet.error) return { error: changeSet.error };
    const dbUpdatesFromMb = await fullFetch({ adminCode, access_token, changeSet });
    if (dbUpdatesFromMb.error) return { error: dbUpdatesFromMb.error };
    const response = await updateAll(dbUpdatesFromMb, dbContext);
    return response;
}
