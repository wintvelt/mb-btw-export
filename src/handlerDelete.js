'use strict';
const deleteExport = require('./helpers-db/deleteExport');
const update = require('./helpers-db/update');
const unexported = require('./helpers-db/unexported');
const s3 = require('./helpers-s3/s3');

const response = (statusCode, bodyOrString) => {
    const body = typeof bodyOrString === 'string' ?
        bodyOrString
        : JSON.stringify(bodyOrString, null, 2);
    return {
        statusCode,
        body
    }
}
module.exports.main = async event => {
    const isBadRequest = (!event || !event.headers || !event.headers.Authorization
        || !event.pathParameters.admin || !event.pathParameters.filename);
    if (isBadRequest) return response(400, "Bad request");
    const adminCode = event.pathParameters.admin;
    const filename = decodeURI(event.pathParameters.filename);

    const latestExportName = await deleteExport.getLatestExport({ adminCode });
    if (latestExportName.error) return response(500, latestExportName.error);

    const latestExport = await deleteExport.getExportedDocs({ adminCode, exportName: filename });
    if (latestExport.error) return response(500, latestExport.error);
    if (!latestExport) return response(200, 'OK');

    const exportedDocs = latestExport;

    const deletedExported = await Promise.all(exportedDocs.map(async (exportedDoc) => {
        const latestState = await update.single({
            adminCode,
            stateName: 'latestState',
            id: exportedDoc.id,
            itemName: 'exportLogs',
            newState: exportedDoc.exportLogs
        });
        const unexportedDoc = (!latestState.error) && await unexported.updateUnexported(latestState);
        const deletedDoc = (unexportedDoc && !unexportedDoc.error) &&
            await deleteExport.deleteExportedDoc({ ...unexportedDoc, stateName: filename });
        const errorFound = latestState.error || (unexportedDoc && unexportedDoc.error) || (deletedDoc && deletedDoc.error);
        return (errorFound) ?
            { error: errorFound }
            : {};
    }));
    const errorFound = deletedExported.find(item => item.error);
    if (errorFound) return response(503, errorFound.error);

    const deletedStats = deleteExport.deleteExportedDoc({ adminCode, stateName: filename, id: 'exportStats' });
    if (deletedStats.error) return response(500, deletedStats.error);

    const deletedXls = await s3.delete({ adminCode, filename });
    if (deletedXls.error) return response(500, deletedXls.error);

    return response(200, 'OK');
};
