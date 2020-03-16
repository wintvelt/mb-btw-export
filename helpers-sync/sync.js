// helpers-sync/sync.js
// to sync database with moneybird latest state
const dbScan = require('../helpers-db/query');
const mbDocs = require('../helpers-mb/fetchDocs');
const mbScan = require('../helpers-mb/fetchVersions');

const changesPartial = (partialOldList = [], fullNewList = []) => {
    const deletedItems = partialOldList.filter(item => !fullNewList.find(it => it.id === item.id));
    const changedItems = fullNewList.filter(item => (
        !!partialOldList.find(it => (it.id === item.id && it.version < item.version))
    ));
    return {
        changed: changedItems.map(item => item.id),
        deleted: deletedItems.map(item => item.id)
    }
}
module.exports.changesPartial = changesPartial;

const changesNew = (fullOldList = [], fullNewList = []) => {
    const newItems = fullNewList.filter(item => !fullOldList.find(it => it.id === item.id));
    return {
        added: newItems.map(item => item.id),
    }
}
module.exports.changesNew = changesNew;

const limitChanges = (changeSet, maxUpdates) => {
    const lengths = [
        changeSet.receipts.added.length,
        changeSet.receipts.changed.length,
        changeSet.receipts.deleted.length,
        changeSet.purchase_invoices.added.length,
        changeSet.purchase_invoices.changed.length,
        changeSet.purchase_invoices.deleted.length
    ];
    const lengthsCumStart = [
        0,
        lengths[0],
        lengths[0] + lengths[1],
        lengths[0] + lengths[1] + lengths[2],
        lengths[0] + lengths[1] + lengths[2] + lengths[3],
        lengths[0] + lengths[1] + lengths[2] + lengths[3] + lengths[4],
    ];
    const maxExceeded = (lengthsCumStart[5] + lengths[5] > maxUpdates);
    const limitedChangeSet = {
        receipts: {
            added: changeSet.receipts.added.slice(0, maxUpdates),
            changed: changeSet.receipts.changed.slice(0, Math.max(0, maxUpdates - lengthsCumStart[1])),
            deleted: changeSet.receipts.deleted.slice(0, Math.max(0, maxUpdates - lengthsCumStart[2])),
        },
        purchase_invoices: {
            added: changeSet.purchase_invoices.added.slice(0, Math.max(0, maxUpdates - lengthsCumStart[3])),
            changed: changeSet.purchase_invoices.changed.slice(0, Math.max(0, maxUpdates - lengthsCumStart[4])),
            deleted: changeSet.purchase_invoices.deleted.slice(0, Math.max(0, maxUpdates - lengthsCumStart[5])),
        }
    }
    return { limitedChangeSet, maxExceeded };
}
module.exports.limitChanges = limitChanges;

const getChangeSet = async ({ adminCode, access_token, TableName, year }) => {
    let changeSet = {
        receipts: { added: [], changed: [], deleted: [] },
        purchase_invoices: { added: [], changed: [], deleted: [] }
    };
    let fullDbVersions = { receipts: [], purchase_invoices: [] };
    let ExclusiveStartKey;
    const mbVersions = await mbScan.mbSync({ adminCode, access_token, year });
    if (mbVersions.error) return { error: mbVersions.error };
    const mbReceiptVersions = mbVersions.receipts;
    const mbPurchase_invoiceVersions = mbVersions.purchase_invoices;

    do {
        const dbResult = await dbScan.queryVersions({
            adminCode,
            TableName,
            ExclusiveStartKey
        });
        if (dbResult.error) return { error: dbResult.error };
        const { items: dbVersions, LastEvaluatedKey } = dbResult;
        const partialSet = {
            receipts: changesPartial(dbVersions.receipts, mbReceiptVersions),
            purchase_invoices: changesPartial(dbVersions.purchase_invoices, mbPurchase_invoiceVersions)
        };
        changeSet.receipts = {
            changed: [...changeSet.receipts.changed, ...partialSet.receipts.changed],
            deleted: [...changeSet.receipts.deleted, ...partialSet.receipts.deleted]
        };
        changeSet.purchase_invoices = {
            changed: [...changeSet.purchase_invoices.changed, ...partialSet.purchase_invoices.changed],
            deleted: [...changeSet.purchase_invoices.deleted, ...partialSet.purchase_invoices.deleted]
        };
        fullDbVersions.receipts = [...fullDbVersions.receipts, ...dbVersions.receipts];
        fullDbVersions.purchase_invoices = [...fullDbVersions.purchase_invoices, ...dbVersions.purchase_invoices];
        ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    const newReceipts = changesNew(fullDbVersions.receipts, mbVersions.receipts);
    const newPurchase_invoices = changesNew(fullDbVersions.purchase_invoices, mbVersions.purchase_invoices);
    changeSet.receipts.added = newReceipts.added;
    changeSet.purchase_invoices.added = newPurchase_invoices.added;

    return changeSet;
}
module.exports.getChangeSet = getChangeSet;

module.exports.getDocUpdates = async ({ adminCode, access_token, TableName, maxUpdates, year }) => {
    const changeSet = await getChangeSet({ adminCode, access_token, TableName, year });
    if (changeSet.error) {
        console.log(changeSet.error);
        return { error: changeSet.error }
    }
    const { limitedChangeSet, maxExceeded } = limitChanges(changeSet, maxUpdates);
    const docUpdates = await mbDocs.fullFetch({ adminCode, access_token, changeSet: limitedChangeSet });
    if (docUpdates.error) return { error: docUpdates.error }
    return {
        docUpdates,
        maxExceeded
    }
}
