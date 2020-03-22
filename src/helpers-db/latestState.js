// helpers-db/latestState.js
// to read/write DynamoDB docTable
'use strict';
const get = require('./get');
const update = require('./update');
const updateConsistent = require('./updateConsistent');
const unexported = require('./unexported');

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

module.exports.updateStateAndUnexported = async ({ latestState }) => {
    const { adminCode, id, state } = latestState;
    const latestStateKeys = {
        adminCode,
        id,
        stateName: 'latestState',
    };
    const latestStateFromDb = await get.get(latestStateKeys);
    const newTimeStamp = Date.now();
    const newLatestState = {
        ...latestStateKeys,
        ...latestStateFromDb,
        state,
        timeStamp: newTimeStamp
    };
    const exportLogs = latestStateFromDb && latestStateFromDb.exportLogs;
    const latestExportName = exportLogs && exportLogs.length > 0 && exportLogs[0];
    const latestExportKeys = {
        adminCode, stateName: latestExportName, id
    }
    const latestExport = latestExportName && await get.get(latestExportKeys);
    if (latestExport && latestExport.error) {
        return errorLog(`Failed to get state of export ${latestExportName}`, latestExport);
    };

    const latestStateUpdate = {
        ...latestStateKeys,
        itemUpdates: [
            { itemName: 'state', newState: state },
            { itemName: 'timeStamp', newState: newTimeStamp }
        ],
        timeStampCheck: (latestStateFromDb)? latestStateFromDb.timeStamp : null
    };
    const latestStateUpdateParams = update.singleWithItemsParams(latestStateUpdate);
    const unexportedUpdateParams = unexported.updateUnexportedParams({
        latestState: newLatestState,
        latestExport
    });
    const result = await updateConsistent.transact({
        updates: [
            latestStateUpdateParams,
            unexportedUpdateParams
        ]
    });
    return result;
}