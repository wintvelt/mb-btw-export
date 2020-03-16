const doubleStr = (num) => (
    (num < 10) ? '0' + num : '' + num
);
module.exports.doubleStr = doubleStr;

const dateStr = (date) => (
    date.getFullYear() + '-' + doubleStr(date.getMonth() + 1) + '-' + doubleStr(date.getDate())
);
module.exports.dateStr = dateStr;

module.exports.filterDate = (start_date, end_date) => (doc) => {
    const { state } = doc;
    return (!start_date || state.date >= start_date)
        && (!end_date || state.date <= end_date)
}