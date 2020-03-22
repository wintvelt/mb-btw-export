// helpers-db/latestState.js
// to read/write DynamoDB docTable
'use strict';
const update = require('./update');

module.exports.addExportParams = ({ latestState, exportName }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs && Array.isArray(exportLogs)) ?
        [exportName, ...exportLogs]
        : [exportName];
    const params = {
        adminCode,
        id,
        stateName: 'latestState',
        itemUpdates: [
            {
                itemName: 'exportLogs',
                newState: newExportLogs
            }
        ]
    };
    return update.singleWithItemsParams(params);
};

module.exports.removeExportParams = ({ latestState }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs) ?
        exportLogs.slice(1)
        : [];
    const params = {
        adminCode,
        id,
        stateName: 'latestState',
        itemUpdates: [{
            itemName: 'exportLogs',
            newState: newExportLogs
        }]
    };
    return update.singleWithItemsParams(params);
};