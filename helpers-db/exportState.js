// for retrieving ids to be exported
'use strict';
const diff = require('./unexported-diff');
const query = require('./query');
const update = require('./update');

const filterDate = (start_date, end_date) => (doc) => {
    const { state } = doc;
    return (!start_date || state.date >= start_date)
        && (!end_date || state.date <= end_date)
}

const doubleStr = (num) => (
    (num < 10) ? '0' + num : '' + num
);
module.exports.doubleStr = doubleStr;

const dateStr = (date) => (
    date.getFullYear() + '-' + doubleStr(date.getMonth() + 1) + '-' + doubleStr(date.getDate())
);

module.exports.getUnexported = async ({ adminCode, start_date, end_date, is_full_report = false }) => {
    let unexportedDocs = [];
    let ExclusiveStartKey;
    let queryError;
    do {
        const result = await query.queryOnce({
            adminCode,
            stateName: 'unexported',
            ExclusiveStartKey
        });
        if (result.error) {
            queryError = { error: result.error }
        } else {
            const { Items, LastEvaluatedKey } = result;
            unexportedDocs = [...unexportedDocs, ...Items];
            ExclusiveStartKey = LastEvaluatedKey;
        };
    } while (ExclusiveStartKey && !queryError);

    if (queryError) return queryError;

    const now = new Date();
    const nowStr = dateStr(now);
    const safeStartDate = start_date || nowStr.slice(0, 4) + '-01-01';
    const filteredDocs = unexportedDocs.filter(filterDate(safeStartDate, end_date));
    return filteredDocs.map((doc) => ({
        id: doc.id,
        adminCode,
        type: doc.state.type,
        date: doc.state.date,
        diff: (is_full_report) ?
            diff.diff(null, doc.state)
            : doc.diff,
        state: doc.state,
        exportLogs: doc.exportLogs
    }));
}

module.exports.setExport = async ({ unexportedDoc, filename }) => {
    const { adminCode, id, state } = unexportedDoc;
    const params = {
        adminCode,
        id,
        stateName: filename,
        itemName: 'state',
        newState: state
    }
    return update.single(params);
};