// helpers-mb/fetchBasics.js
// to retrieve descriptions from moneybird for tax rates and ledger accounts
const fetch = require('node-fetch');

const baseUrl = 'https://moneybird.com/api/v2';
const dataPaths = [
    '/tax_rates.json',
    '/ledger_accounts.json'
];

const fetchBasics = ({ adminCode, access_token }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    return Promise.all(
        dataPaths.map((path) => {
        const url = `${baseUrl}/${adminCode}${path}`;
        return fetch(url, { headers, method: 'GET' })
            .then(res => res.json())
            .catch(error => ({ error: error.message }));
    }));
}
module.exports.fetchBasics = fetchBasics;