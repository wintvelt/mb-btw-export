// helpers-excel/excel.js
// to create an excel document from a list of states
'use strict';
const Excel = require('exceljs');
const fetchBasics = require('../helpers-mb/fetchBasics');

const columnHeaders = ['tax-rate', 'account', 'docId', 'moneybird',
    'company', 'country', 'type', 'date', 'change', 'bedrag EX BTW'];

const findName = (id, listWithIds) => {
    const safeList = Array.isArray(listWithIds) ? listWithIds : [];
    const itemFound = safeList.find(item => item.id === id);
    return (itemFound) ?
        itemFound.name
        : '';
}

module.exports.makeXlsRows = async ({ exportDocs, adminCode, access_token }) => {
    const [taxRates, ledgerAccounts] = await fetchBasics.fetchBasics({ adminCode, access_token });
    let exportRows = [];
    const docsLength = exportDocs.length;
    for (let i = 0; i < docsLength; i++) {
        const exportDoc = exportDocs[i];
        const { id, date, type, company, country } = exportDoc;
        const details = exportDoc.diff;
        const detailsLength = details.length;
        for (let j = 0; j < detailsLength; j++) {
            const detail = details[j];
            exportRows.push([
                findName(detail.tax_rate_id, taxRates),
                findName(detail.ledger_account_id, ledgerAccounts),
                id,
                {
                    text: 'link',
                    hyperlink: `https://moneybird.com/${adminCode}/documents/${id}`,
                    tooltip: 'Klik om naar Moneybird doc te gaan',
                },
                company,
                country,
                type,
                date,
                detail.change,
                detail.amount
            ])
        }
    }
    return exportRows;
}

module.exports.makeXls = async (exportRows) => {
    if (!exportRows || exportRows.length === 0) return null;
    let workbook = new Excel.Workbook();
    workbook.creator = 'Moblybird';
    workbook.lastModifiedBy = 'Moblybird';
    workbook.created = new Date();

    let sheet = workbook.addWorksheet('Moblybird btw-export');
    sheet.addRow(columnHeaders);

    for (let i = 0; i < exportRows.length; i++) {
        const newRow = exportRows[i];
        sheet.addRow(newRow);
    }

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.font = { bold: true }
        } else {
            row.font = { bold: false }
        }
    });

    let linkCol = sheet.getColumn(4);
    linkCol.font = { color: { argb: 'FF00ACC2' } };
    sheet.getCell('D1').font = { color: { argb: 'FF000000' } };

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.font = { bold: true }
        } else {
            row.font = { bold: false }
        }
    });

    sheet.getColumn(4).eachCell(cell => {
        if (cell.text === 'link') cell.font = { color: { argb: 'FF00ACC2' } }
    });

    const widths = [30, 30, 20, 10, 30, 10, 20, 20, 10, 10];
    widths.forEach((v, i) => {
        sheet.getColumn(i + 1).width = v;
    })

    const xlsBuffer = await workbook.xlsx.writeBuffer();
    return xlsBuffer;
}