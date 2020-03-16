// helpers-db/latestState.js
// to read/write DynamoDB docTable
'use strict';
const updateSingle = require('./update').single;

module.exports.addExport = ({ latestState, exportName }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs) ?
        [exportName, ...exportLogs]
        : [exportName];
    const params = {
        adminCode,
        id, 
        stateName: 'latestState', 
        itemName: 'exportLogs', 
        newState: newExportLogs
    };
    return updateSingle(params);
};

module.exports.removeExport = ({ latestState }) => {
    const { adminCode, id, exportLogs } = latestState;
    const newExportLogs = (exportLogs) ?
        exportLogs.slice(1)
        : [];
    const params = {
        adminCode,
        id, 
        stateName: 'latestState', 
        itemName: 'exportLogs', 
        newState: newExportLogs
    };
    return updateSingle(params);
};