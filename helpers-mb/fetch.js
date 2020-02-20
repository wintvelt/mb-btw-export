// helpers-mb/fetch.js
// to retrieve receipts and purchase invoices from moneybird
const fetch = require('node-fetch');

const C = 100;
const baseUrl = 'https://moneybird.com/api/v2';

const slicesOfC = (inArr, outArr = []) => {
    const remaining = inArr.length;
    return remaining > C ?
        sliceOfC(inArr.slice(C), [...outArr, inArr.slice(0, C)])
        : [...outArr, inArr]
}

const idsToFetch = ({ added = [], changed = [] }) => [...added, ...changed];

module.exports.singleFetch = ({ adminCode, access_token, type, ids }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    const url = `${baseUrl}/${adminCode}/documents/${type}/synchronization.json`;
    const body = JSON.stringify({ ids });
    const response = fetch(url, { headers, method: 'POST', body })
        .then(res => res.json())
        .catch(error => ({ error: error.message }));
    return response;
}