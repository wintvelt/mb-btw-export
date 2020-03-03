// helpers-db/update-all.js
const docTable = require('./docTable');

module.exports.promise = async (batchList, context) => {
    const results = await Promise.all(
        batchList.map(record => docTable.updateSingle(record, context))
    );
    const errorFound = results.find(item => item.error);
    if (errorFound) return { error: errorFound.error }
    return results;
}