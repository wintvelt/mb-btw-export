// updateSingle.js
// to update both docs table and export table with latest state
'use strict';

const docTable = require('./docTable');
const exportTable = require('./exportTable-item');

module.exports.updateSingle = async ({ adminCode, id, latestState, docTableName, exportTableName }) => {
    const docUpdateResult = await docTable.updateSingle({
        adminCode,
        id,
        state: 'latestState',
        newState: latestState
    }, { TableName: docTableName });
    if (docUpdateResult.error) return { error: docUpdateResult.error };
    const fullDocRecord = docUpdateResult.Attributes;

    const exportUpdateResult = await exportTable.updateSingleUnexported(
        fullDocRecord,
        { TableName: exportTableName }
    );
    if (exportUpdateResult.error) return { error: exportUpdateResult.error };
    return fullDocRecord;
}