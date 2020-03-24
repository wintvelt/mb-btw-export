// for retrieving ids to be exported
'use strict';
const diff = require('./unexported-diff');
const query = require('./query');
const update = require('./update');
const dateHelpers = require('../helpers/date');
const filterDate = dateHelpers.filterDate;
const errorLog = require('../helpers/request').errorLog;


const bucketName = process.env.PUBLIC_BUCKETNAME || 'moblybird-folders';
const folderName = process.env.FOLDER_NAME || 'public';
const s3Url = process.env.S3_URL || 's3.eu-central-1.amazonaws.com';


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

    if (queryError) return errorLog('Failed to get unexported in exportState', queryError);

    const now = new Date();
    const nowStr = dateHelpers.dateStr(now);
    const safeStartDate = start_date || nowStr.slice(0, 4) + '-01-01';
    const filteredDocs = unexportedDocs.filter(filterDate(safeStartDate, end_date));
    return filteredDocs.map((doc) => ({
        id: doc.id,
        adminCode,
        diff: (is_full_report) ?
            diff.diff(null, doc.state)
            : doc.diff,
        state: doc.state,
        exportLogs: doc.exportLogs,
    }));
}

module.exports.setExportParams = ({ unexportedDoc, filename }) => {
    const { adminCode, id, state, exportLogs, previousState } = unexportedDoc;
    let itemUpdates = [
        { itemName: 'state', newState: state },
        { itemName: 'exportLogs', newState: exportLogs },
    ];
    if (previousState) itemUpdates.push({
        itemName: 'previousState', newState: previousState
    });
    const params = {
        adminCode,
        id,
        stateName: filename,
        itemUpdates
    };
    return update.singleWithItemsParams(params);
};

module.exports.makeExportStats = ({ adminCode, exportDocs, filename }) => {
    const create_date = dateHelpers.dateStr(new Date());
    const url = `https://${bucketName}.${s3Url}/${folderName}/${adminCode}/btw-export/${filename}`
    let start_date;
    let end_date;
    let doc_count = exportDocs.length;
    for (let i = 0; i < doc_count; i++) {
        const exportDoc = exportDocs[i];
        const docDate = exportDoc.state.date;
        if (!start_date || docDate < start_date) start_date = docDate;
        if (!end_date || docDate > end_date) end_date = docDate;
    }
    return {
        filename,
        url,
        create_date,
        start_date,
        end_date,
        doc_count
    }
}

module.exports.saveStats = ({ adminCode, stateName, exportStats }) => {
    return update.single({
        adminCode,
        id: 'exportStats',
        stateName,
        itemName: 'state',
        newState: exportStats
    })
}