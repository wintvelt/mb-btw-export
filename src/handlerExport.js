'use strict';
const exportState = require('./helpers-db/exportState');
const latestState = require('./helpers-db/latestState');
const unexported = require('./helpers-db/unexported');
const dateHelpers = require('./helpers/date');
const doubleStr = dateHelpers.doubleStr;
const request = require('./helpers/request');

const excel = require('./helpers-excel/excel');
const s3 = require('./helpers-s3/s3');

const makeFilename = () => {
    const now = new Date();
    const timeStamp =
        now.getFullYear() + '-' + doubleStr(now.getMonth() + 1) + '-' + doubleStr(now.getDate())
        + ' ' + doubleStr(now.getHours()) + 'u' + doubleStr(now.getMinutes()) + 'm' + doubleStr(now.getSeconds()) + 's';
    return `btw-export ${timeStamp}.xlsx`;
};

module.exports.main = async event => {
    const isBadRequest = (!event || !event.pathParameters.admin ||
        !event.headers || !event.headers.Authorization || !event.body);
    if (isBadRequest) return request.response(401, "Unauthorized");
    const adminCode = event.pathParameters.admin;
    const access_token = event.headers.Authorization.slice(6);
    const filename = makeFilename();

    const { start_date, end_date, is_full_report } = event.body;
    console.log(event.body);
    const exportDocs = await exportState.getUnexported({
        adminCode,
        start_date,
        end_date,
        is_full_report,
    });
    if (exportDocs.error) return request.response(501, exportDocs.error);
    if (exportDocs.length === 0) return request.response(200, "Nothing to export");

    const xlsRows = await excel.makeXlsRows({
        exportDocs,
        adminCode,
        access_token
    });
    if (xlsRows.error) return request.response(500, xlsRows.error);

    const xlsBuffer = await excel.makeXls(xlsRows);

    const saveParams = {
        adminCode,
        filename,
        content: xlsBuffer,
        contentType: 'application/octet-stream'
    }
    const savePromise = s3.save(saveParams);

    const docUpdatePromises = exportDocs.map(async (unexportedDoc) => {
        const exportInDb = await exportState.setExport({
            unexportedDoc,
            filename
        });
        const exportLogsInLatest = await latestState.addExport({
            latestState: unexportedDoc,
            exportName: filename
        });
        const removeFromUnexported = await unexported.removeUnexported(unexportedDoc);
        const errorFound = exportInDb.error || exportLogsInLatest.error || removeFromUnexported.error;
        return (errorFound) ?
            { error: errorFound }
            : {};
    });

    const result = await Promise.all([
        savePromise,
        ...docUpdatePromises
    ]);
    const errorFound = result.find(item => item.error);
    if (errorFound) return request.response(500, errorFound.error);

    const exportStats = exportState.makeExportStats({ adminCode, exportDocs, filename });
    const summarySaveResult = await exportState.saveStats({ adminCode, stateName: filename, exportStats });
    if (summarySaveResult.error) {
        console.log(summarySaveResult);
        return request.response(500, summarySaveResult.error);
    }

    return request.response(201, exportStats);
};
