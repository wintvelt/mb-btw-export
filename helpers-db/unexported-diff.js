// unexported-diff.js
// to calculate the difference between 2 document states

/* list with
tax rate
change: added/ changed/ deleted
ledger account id
doc id
amount

for each tax: find in old
if found: make change line + remove old line
otherwise: make new line
for all remaining old lines, make deleted line
*/

const getLatestExport = (docRecord) => {
    const allExportKeys = Object.keys(docRecord).filter(key => (
        key !== 'id' && key !== 'latestState' && key !== 'adminCode' && key !== 'latestDiff'
    ));
    let latestExportState = null;
    for (let i = 0; i < allExportKeys.length; i++) {
        const key = allExportKeys[i];
        const state = docRecord[key];
        if (!latestExportState || state.latestState.isDeleted 
            || state.latestState.version > latestExportState.latestState.version) {
            latestExportState = state;
        }
        if (state.latestState.isDeleted) break;
    }
    return latestExportState;
};
module.exports.getLatestExport = getLatestExport;

const toNum = (str) => (Math.round(parseFloat(str.replace(',', '.')) * 100) / 100);

const mapAmount = (detail) => ({ ...detail, amount: toNum(detail.total_price_excl_tax_with_discount_base) });

const sameType = (oldDetail, newDetail) => (
    oldDetail.tax_rate_id === newDetail.tax_rate_id
    && oldDetail.ledger_account_id === newDetail.ledger_account_id
);

const diff = (oldState, newState) => {
    let diffArray = [];
    if ((!oldState || oldState.isDeleted) && newState.isDeleted) return diffArray;

    const oldDetails = (oldState && oldState.details) ? [...oldState.details] : [];
    let oldAmounts = oldDetails.map(mapAmount);
    const newDetails = (newState.details) ? newState.details : [];
    const newAmounts = newDetails.map(mapAmount);
    const newDetailsLength = newAmounts.length;
    for (let i = 0; i < newDetailsLength; i++) {
        const newDetail = newAmounts[i];
        let amount = newDetail.amount;
        let change = 'added';
        for (let j = 0; j < oldAmounts.length; j++) {
            const oldDetail = oldAmounts[j];
            if (sameType(oldDetail, newDetail)) {
                amount = Math.round((amount - oldDetail.amount) * 100) / 100;
                change = 'changed';
            }
        }
        oldAmounts = oldAmounts.filter((oldDetail) => !sameType(oldDetail, newDetail));
        if (amount !== 0) {
            diffArray.push({
                tax_rate_id: newDetail.tax_rate_id,
                ledger_account_id: newDetail.ledger_account_id,
                change,
                amount
            });
        }
    }
    for (let j = 0; j < oldAmounts.length; j++) {
        const remainingOld = oldAmounts[j];
        diffArray.push({
            tax_rate_id: remainingOld.tax_rate_id,
            ledger_account_id: remainingOld.ledger_account_id,
            change: 'deleted',
            amount: -remainingOld.amount
        })
    }
    return diffArray;
}
module.exports.diff = diff;

module.exports.diffState = (docRecord) => {
    const latestExport = getLatestExport(docRecord);
    return diff(latestExport? latestExport.latestState : null, docRecord.latestState);
}