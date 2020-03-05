// updateSingle.js
// to update both docs table and export table with latest state
'use strict';

const docTable = require('./docTable');
const exportTable = require('./exportTable');

module.exports.updateSingle = async ({ id, latestState, docTableName, exportTableName }) => {
    const docUpdateResult = await docTable.updateSingle({
        id,
        key: 'latestState',
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