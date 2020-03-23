// helpers-excel/excel.js
// to create an excel document from a list of states
'use strict';
const Excel = require('exceljs');
const fetchBasics = require('../helpers-mb/fetchBasics');

const columnHeaders = ['tax-rate', 'account', 'account Id', 'docId', 'moneybird',
    'company', 'country', 'type', 'date', 'change', 'bedrag EX BTW'];

const summaryHeaders = ['tax-rate', 'change', 'bedrag EX BTW', 'totaal bedrag EX BTW'];
const catHeaders = ['account', 'change', 'bedrag EX BTW', 'totaal bedrag EX BTW'];

const findKey = (key) => (id, listWithIds) => {
    const safeList = Array.isArray(listWithIds) ? listWithIds : [];
    const itemFound = safeList.find(item => item.id === id);
    return (itemFound) ?
        itemFound[key]
        : '';
}
const findName = (id, listWithIds) => findKey('name')(id, listWithIds);
const findAccountId = (id, listWithIds) => findKey('account_id')(id, listWithIds);


module.exports.makeXlsRows = async ({ exportDocs, adminCode, access_token }) => {
    const [taxRates, ledgerAccounts] = await fetchBasics.fetchBasics({ adminCode, access_token });
    let exportRows = [];
    const docsLength = exportDocs.length;
    for (let i = 0; i < docsLength; i++) {
        const exportDoc = exportDocs[i];
        const { id, state } = exportDoc;
        const { date, type, company, country } = state;
        const details = exportDoc.diff;
        const detailsLength = details.length;
        for (let j = 0; j < detailsLength; j++) {
            const detail = details[j];
            exportRows.push([
                findName(detail.tax_rate_id, taxRates),
                findName(detail.ledger_account_id, ledgerAccounts),
                findAccountId(detail.ledger_account_id, ledgerAccounts),
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

const makeXlsSumRows = ({ exportRows }) => {
    let sumObj = {};
    let catObj = {};
    const exportRowsLength = exportRows.length;
    for (let i = 0; i < exportRowsLength; i++) {
        const row = exportRows[i];
        const tax_rate = row[0];
        const change = row[9];
        const amount = row[10];
        if (!sumObj[tax_rate]) sumObj[tax_rate] = {};
        if (!sumObj[tax_rate][change]) sumObj[tax_rate][change] = 0;
        if (!sumObj[tax_rate].total) sumObj[tax_rate].total = 0;
        sumObj[tax_rate][change] += amount;
        sumObj[tax_rate].total += amount;
        const account = row[1] + ' - ' + row[2];
        if (!catObj[account]) catObj[account] = {};
        if (!catObj[account][change]) catObj[account][change] = 0;
        if (!catObj[account].total) catObj[account].total = 0;
        catObj[account][change] += amount;
        catObj[account].total += amount;
    }
    let sumRows = [];
    let taxRates = Object.keys(sumObj);
    for (let i = 0; i < taxRates.length; i++) {
        const tax_rate = taxRates[i];
        const lines = Object.keys(sumObj[tax_rate]);
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            let newSumRow = [];
            newSumRow[0] = tax_rate;
            if (line !== 'total') {
                newSumRow[1] = line;
                newSumRow[2] = sumObj[tax_rate][line];
            } else {
                newSumRow[3] = sumObj[tax_rate].total;
            }
            sumRows.push(newSumRow);
        }
    }
    let catRows = [];
    let accounts = Object.keys(catObj);
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const lines = Object.keys(catObj[account]);
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            let newCatRow = [];
            newCatRow[0] = account;
            if (line !== 'total') {
                newCatRow[1] = line;
                newCatRow[2] = catObj[account][line];
            } else {
                newCatRow[3] = catObj[account].total;
            }
            catRows.push(newCatRow);
        }
    }
    return { sumRows, catRows };
}
module.exports.makeXlsSumRows = makeXlsSumRows;

module.exports.makeXls = async (exportRows) => {
    if (!exportRows || exportRows.length === 0) return null;
    let workbook = new Excel.Workbook();
    workbook.creator = 'Moblybird';
    workbook.lastModifiedBy = 'Moblybird';
    workbook.created = new Date();

    const { sumRows, catRows } = makeXlsSumRows({ exportRows });

    // summary sheet
    let summarySheet = workbook.addWorksheet('btw-export overzicht');
    summarySheet.addRow(summaryHeaders);

    for (let i = 0; i < sumRows.length; i++) {
        const newRow = sumRows[i];
        summarySheet.addRow(newRow);
    }

    summarySheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.font = { bold: true }
        } else {
            row.font = { bold: false }
        }
    });

    const sumWidths = [30, 20, 20, 20];
    sumWidths.forEach((v, i) => {
        summarySheet.getColumn(i + 1).width = v;
    });
    summarySheet.getColumn(3).numFmt = '€#,##0.00;[Red]-€#,##.00';
    summarySheet.getColumn(4).numFmt = '€#,##0.00;[Red]-€#,##0.00';

    // category sheet
    let catSheet = workbook.addWorksheet('rekeningen overzicht');
    catSheet.addRow(catHeaders);

    for (let i = 0; i < catRows.length; i++) {
        const newRow = catRows[i];
        catSheet.addRow(newRow);
    }

    catSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.font = { bold: true }
        } else {
            row.font = { bold: false }
        }
    });

    sumWidths.forEach((v, i) => {
        catSheet.getColumn(i + 1).width = v;
    });
    catSheet.getColumn(3).numFmt = '€#,##0.00;[Red]-€#,##.00';
    catSheet.getColumn(4).numFmt = '€#,##0.00;[Red]-€#,##0.00';

    // details sheet
    let detailSheet = workbook.addWorksheet('btw-export details');
    detailSheet.addRow(columnHeaders);

    for (let i = 0; i < exportRows.length; i++) {
        const newRow = exportRows[i];
        detailSheet.addRow(newRow);
    }

    detailSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.font = { bold: true }
        } else {
            row.font = { bold: false }
        }
    });

    let linkCol = detailSheet.getColumn(5);
    linkCol.font = { color: { argb: 'FF00ACC2' } };
    detailSheet.getCell('D1').font = { color: { argb: 'FF000000' } };

    detailSheet.getColumn(5).eachCell(cell => {
        if (cell.text === 'link') cell.font = { color: { argb: 'FF00ACC2' } }
    });

    const widths = [30, 30, 10, 20, 10, 30, 10, 20, 20, 10, 10];
    widths.forEach((v, i) => {
        detailSheet.getColumn(i + 1).width = v;
    });
    detailSheet.getColumn(11).numFmt = '€#,##0.00;[Red]-€#,##0.00';

    const xlsBuffer = await workbook.xlsx.writeBuffer();
    return xlsBuffer;
}