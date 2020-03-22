'use strict';
const deleteExport = require('./helpers-db/deleteExport');
const update = require('./helpers-db/update');
const updateConsistent = require('./helpers-db/updateConsistent');
const get = require('./helpers-db/get');
const unexported = require('./helpers-db/unexported');
const s3 = require('./helpers-s3/s3');
const request = require('./helpers/request');

module.exports.main = async event => {
    const isBadRequest = (!event || !event.headers || !event.headers.Authorization
        || !event.pathParameters.admin || !event.pathParameters.filename);
    if (isBadRequest) return request.response(400, "Bad request");
    const adminCode = event.pathParameters.admin;
    const filename = decodeURI(event.pathParameters.filename);

    const latestExportName = await deleteExport.getLatestExport({ adminCode });
    if (latestExportName.error) {
        console.log('failed to retrieve latest exportName')
        return request.response(500, latestExportName.error)
    };
    if (latestExportName !== filename) {
        console.log(400, 'Cannot delete this file.')
        return request.response(500, latestExportName.error)
    };

    const latestExport = await deleteExport.getExportedDocs({ adminCode, exportName: latestExportName });
    if (latestExport.error) {
        console.log('failed to retrieve latest export docs');
        return request.response(500, latestExport.error)
    };
    if (!latestExport) return request.response(200, 'Nothing to delete');

    const exportedDocs = latestExport;

    const deletedExported = await Promise.all(exportedDocs.map(async (exportedDoc) => {
        const docKeys = {
            adminCode,
            stateName: 'latestState',
            id: exportedDoc.id
        }
        const latestStateFromDb = await get.get(docKeys);
        if (latestStateFromDb.error) return { error: latestStateFromDb.error };

        const newExportLogs = (exportedDoc.exportLogs) ? exportedDoc.exportLogs.slice(1) : [];
        const newLatestState = {
            ...latestStateFromDb,
            exportLogs: newExportLogs,
            timeStamp: Date.now()
        }

        const removeExportFromLatestParams = update.singleWithItemsParams({
            ...docKeys,
            itemUpdates: [{ itemName: 'exportLogs', newState: newExportLogs }],
            timeStampCheck: latestStateFromDb.timeStamp
        });
        const newUnexportedParams = unexported.updateUnexportedParams({
            latestState: newLatestState,
            latestExport: exportedDoc
        });
        const deleteExportParams = deleteExport.deleteExportedDocParams({
            ...docKeys,
            stateName: latestExportName
        });

        const result = await updateConsistent.transact({
            updates: [
                removeExportFromLatestParams,
                newUnexportedParams,
                deleteExportParams
            ]
        });
        return result;
    }));
    const errorFound = deletedExported.find(item => item.error);
    if (errorFound) {
        console.log('failed to delete latest export from docs');
        return request.response(500, errorFound.error)
    };

    const deletedStats = await deleteExport.deleteExportedDoc({ adminCode, stateName: latestExportName, id: 'exportStats' });
    if (deletedStats.error) {
        console.log('failed to delete exportStats');
        return request.response(500, deletedStats.error)
    };

    const deletedXls = await s3.delete({ adminCode, latestExportName });
    if (deletedXls.error) {
        console.log('failed to delete xls from S3')
        return request.response(500, deletedXls.error)
    };

    return request.response(200, 'Deleted export');
};
