// for retrieving ids to be exported
'use strict';
const diff = require('./unexported-diff');
const query = require('./query');
const update = require('./update');
const dateHelpers = require('../helpers/date');

const filterDate = (start_date, end_date) => (doc) => {
    const { state } = doc;
    return (!start_date || state.date >= start_date)
        && (!end_date || state.date <= end_date)
}

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
    const nowStr = dateHelpers.dateStr(now);
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
    const { adminCode, id, state, exportLogs } = unexportedDoc;
    const params = {
        adminCode,
        id,
        stateName: filename,
        itemUpdates: [
            { itemName: 'state', newState: state },
            { itemName: 'exportLogs', newState: exportLogs },
        ]
    };
    return update.singleWithItems(params);
};