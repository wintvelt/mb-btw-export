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
    const url = `${baseUrl}/${adminCode}/documents/${type}s/synchronization.json`;
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

const stripRecord = (type) => ({ id, date, version, details }) => (
    {
        id,
        latest_state: {
            type: type,
            date,
            version,
            details: details? details.map(stripDetail) : []
        }
    }
);
module.exports.stripRecord = stripRecord;

const typeFetch = async ({ adminCode, access_token, type, typeChangeSet }) => {
    const idList = idsToFetch(typeChangeSet);
    const idBatches = slicesOfC(idList);
    const fetchParams = { adminCode, access_token, type };
    const recordBatches = await Promise.all(
        idBatches.map(ids => singleFetch({ ...fetchParams, ids }))
    );
    const fetchError = recordBatches.find(it => it.error);
    return fetchError || flatten(recordBatches).map(stripRecord(type));
}
module.exports.typeFetch = typeFetch;

const setDeleted = id => ({ id, latest_state: { isDeleted: true } })

module.exports.fullFetch = async ({ adminCode, access_token, changeSet }) => {
    const params = { adminCode, access_token };
    const [receiptInfo, purchInvInfo] = await Promise.all([
        typeFetch(
            { ...params, type: 'receipt', typeChangeSet: changeSet.receipts }
        ),
        typeFetch(
            { ...params, type: 'purchase_invoice', typeChangeSet: changeSet.purchase_invoices }
        )
    ]);
    if (receiptInfo.error || purchInvInfo.error) return {
        error: receiptInfo.error || purchInvInfo.error
    };
    const receiptsDeleted = changeSet.receipts.deleted.map(setDeleted);
    const purchInvDeleted = changeSet.purchase_invoices.deleted.map(setDeleted);
    return [
        ...receiptInfo,
        ...receiptsDeleted,
        ...purchInvInfo,
        ...purchInvDeleted
    ];
}