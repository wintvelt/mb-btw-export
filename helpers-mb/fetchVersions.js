const fetch = require('node-fetch');

const baseUrl = 'https://moneybird.com/api/v2';

const dedupe = (list) => {
    let outList = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (i === 0 || item.id !== list[i - 1].id) {
            outList.push(item)
        }
    }
    return outList;
}

const periodFilter = (year) => (`,period:${year}01..${new Date().getFullYear()}12`);

const mbTypeSync = async ({ adminCode, access_token, type, year }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    const filter = encodeURI('filter=state:saved|open|late|paid|pending_payment' + periodFilter(year));
    const url = `${baseUrl}/${adminCode}/documents/${type}/synchronization.json?${filter}`;
    const response = fetch(url, { headers, method: 'GET' })
        .then(res => res.json())
        .catch(error => ({ error: error.message }));
    return response;
}
module.exports.mbTypeSync = mbTypeSync;

const mbSync = async ({ adminCode, access_token, year }) => {
    const [receipts, purchase_invoices] = await Promise.all([
        mbTypeSync({ adminCode, access_token, type: 'receipts', year }),
        mbTypeSync({ adminCode, access_token, type: 'purchase_invoices', year }),
    ]);
    const possibleError = receipts.error || purchase_invoices.error;
    if (possibleError) return { error: possibleError };
    return {
        receipts: dedupe(receipts),
        purchase_invoices: dedupe(purchase_invoices)
    }
}
module.exports.mbSync = mbSync;
