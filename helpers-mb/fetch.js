// helpers-mb/fetch.js
// to retrieve receipts and purchase invoices from moneybird
const fetch = require('node-fetch');

const C = 100;
const baseUrl = 'https://moneybird.com/api/v2';

const slicesOfC = (inArr, outArr = []) => {
    const remaining = inArr.length;
    return remaining > C ?
        slicesOfC(inArr.slice(C), [...outArr, inArr.slice(0, C)])
        : [...outArr, inArr]
}
const flatten = batches => batches.reduce((prev, curr) => [...prev, ...curr], [])

const idsToFetch = ({ added = [], changed = [] }) => [...added, ...changed];

const singleFetch = ({ adminCode, access_token, type, ids }) => {
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
module.exports.singleFetch = singleFetch;

const stripDetail = ({ id, total_price_excl_tax_with_discount_base, tax_rate_id, ledger_account_id }) => (
    { id, total_price_excl_tax_with_discount_base, tax_rate_id, ledger_account_id }
);

const stripRecord = (type) => ({ id, date, details }) => (
    {
        id,
        latest_state: {
            type: type.slice(0,-1),
            date,
            details: details.map(stripDetail)
        }
    }
);

const typeFetch = async ({ adminCode, access_token, type, idSet }) => {
    const idList = idsToFetch(idSet);
    const idBatches = slicesOfC(idList);
    const fetchParams = { adminCode, access_token, type };
    const recordBatches = await Promise.all(
        idBatches.map(ids => singleFetch({ ...fetchParams, ids }))
    );
    const errorFound = recordBatches.find(it => it.error);
    return errorFound || flatten(recordBatches).map(stripRecord(type));
}
module.exports.typeFetch = typeFetch;