// helpers-sync/sync.js
// to sync database with moneybird latest state
const fetch = require('node-fetch');
const scan = require('../helpers-db/scan');
const mbHelpers = require('../helpers-mb/fetch');

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

const changes = (oldList = [], newList = []) => {
    const newItems = newList.filter(item => !oldList.find(it => it.id === item.id));
    const deletedItems = oldList.filter(item => !newList.find(it => it.id === item.id));
    const changedItems = newList.filter(item => !!oldList.find(it => (it.id === item.id && it.version < item.version)));
    return {
        added: newItems.map(item => item.id),
        changed: changedItems.map(item => item.id),
        deleted: deletedItems.map(item => item.id)
    }
}
module.exports.changes = changes;

const mbTypeSync = async ({ adminCode, access_token, type }) => {
    const headers = {
        Authorization: 'Bearer ' + access_token,
        "Content-Type": "application/json",
    };
    const filter = encodeURI('filter=state:saved|open|late|paid|pending_payment');
    const url = `${baseUrl}/${adminCode}/documents/${type}/synchronization.json?${filter}`;
    const response = fetch(url, { headers, method: 'GET' })
        .then(res => res.json())
        .catch(error => ({ error: error.message }));
    return response;
}
module.exports.mbTypeSync = mbTypeSync;

const mbSync = async ({ adminCode, access_token }) => {
    const [receipts, purchase_invoices] = await Promise.all([
        mbTypeSync({ adminCode, access_token, type: 'receipts' }),
        mbTypeSync({ adminCode, access_token, type: 'purchase_invoices' }),
    ]);
    const possibleError = receipts.error || purchase_invoices.error;
    if (possibleError) return { error: possibleError };
    return {
        receipts: dedupe(receipts),
        purchase_invoices: dedupe(purchase_invoices)
    }
}
module.exports.mbSync = mbSync;

const limitChanges = (changeSet, maxUpdates) => {
    const maxExceeded = (
        changeSet.receipts.added.length > maxUpdates ||
        changeSet.receipts.changed.length > maxUpdates ||
        changeSet.receipts.deleted.length > maxUpdates ||
        changeSet.purchase_invoices.added.length > maxUpdates ||
        changeSet.purchase_invoices.changed.length > maxUpdates ||
        changeSet.purchase_invoices.deleted.length > maxUpdates
    )
    const limitedChangeSet = {
        receipts: {
            added: changeSet.receipts.added.slice(0, maxUpdates),
            changed: changeSet.receipts.changed.slice(0, maxUpdates),
            deleted: changeSet.receipts.deleted.slice(0, maxUpdates),
        },
        purchase_invoices: {
            added: changeSet.purchase_invoices.added.slice(0, maxUpdates),
            changed: changeSet.purchase_invoices.changed.slice(0, maxUpdates),
            deleted: changeSet.purchase_invoices.deleted.slice(0, maxUpdates),
        }
    }
    return [limitedChangeSet, maxExceeded];
}

module.exports.getSyncUpdates = async ({ adminCode, access_token, TableName, maxUpdates }) => {
    const [dbVersions, mbVersions] = await Promise.all([
        scan.scanDbVersions({ TableName }),
        mbSync({ adminCode, access_token }),
    ]);
    const possibleError = mbVersions.error || dbVersions.error;
    if (possibleError) return { error: possibleError };
    const changeSet = {
        receipts: changes(dbVersions.receipts, mbVersions.receipts),
        purchase_invoices: changes(dbVersions.purchase_invoices, mbVersions.purchase_invoices),
    }
    const [limitedChangeSet, maxExceeded] = limitChanges(changeSet, maxUpdates);
    const docUpdates = await mbHelpers.fullFetch({ adminCode, access_token, changeSet: limitedChangeSet });
    if (docUpdates.error) return { error: docUpdates.error }
    return {
        docUpdates,
        maxExceeded
    }
}