// helpers-sync/sync.js
// to trigger lambda to sync with moneybird
const fetch = require('node-fetch');

const baseUrl = 'https://qix8ox7ufk.execute-api.eu-central-1.amazonaws.com/dev/mb-incoming-sync';

module.exports.promise = ({ adminCode, access_token }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    const url = `${baseUrl}/${adminCode}`;
    const response = fetch(url, { headers, method: 'POST' })
        .then(res => res.status === 200? 
            res.json() : 
            { error: `${res.status} ${res.statusText}`}
        )
        .catch(error => ({ error: error.message }));
    return response;
}
