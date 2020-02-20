// helpers-db/update-all.js
const update = require('./update');

module.exports.promise = async (batchList, context) => {
    const results = await Promise.all(
        batchList.map(record => update.promise(record, context))
    );
    const errorFound = results.find(item => item.error);
    if (errorFound) return { error: errorFound.error }
    return results;
}