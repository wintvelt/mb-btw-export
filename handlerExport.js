'use strict';
const exportState = require('./helpers-db/exportState');
const latestState = require('./helpers-db/latestState');
const unexported = require('./helpers-db/unexported');
const doubleStr = exportState.doubleStr;

const excel = require('./helpers-excel/excel');
const s3 = require('./helpers-s3/s3');

const bucketName = process.env.PUBLIC_BUCKETNAME || 'moblybird-export-files';
const folderName = process.env.FOLDER_NAME || 'public';

const response = (statusCode, bodyOrString) => {
    const body = typeof bodyOrString === 'string' ?
        bodyOrString
        : JSON.stringify(bodyOrString, null, 2);
    return {
        statusCode,
        body
    }
};

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
    if (isBadRequest) return response(400, "Unauthorized");
    const adminCode = event.pathParameters.admin;
    const access_token = event.headers.Authorization.slice(6);
    const filename = makeFilename();

    const { start_date, end_date, is_full_report } = event.body;
    const exportDocs = await exportState.getUnexported({
        adminCode,
        start_date,
        end_date,
        is_full_report,
    });
    if (exportDocs.error) return response(501, exportDocs.error);
    if (exportDocs.length === 0) return response(200, "OK");

    const xlsRows = await excel.makeXlsRows({
        exportDocs,
        adminCode,
        access_token
    });
    if (xlsRows.error) return response(502, xlsRows.error);

    const xlsBuffer = await excel.makeXls(xlsRows);

    const saveParams = {
        bucketName,
        filename: `${folderName}/${adminCode}/btw-export/${filename}`,
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
        return (errorFound)?
            { error: errorFound }
            : {};
    });

    const result = await Promise.all([
        savePromise,
        ...docUpdatePromises
    ]);
    const errorFound = result.find(item => item.error);
    if (errorFound) return response(503, errorFound.error);

    return response(201, "Export created");
};
