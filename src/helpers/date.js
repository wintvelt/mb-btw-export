const doubleStr = (num) => (
    (num < 10) ? '0' + num : '' + num
);
module.exports.doubleStr = doubleStr;

const dateStr = (date) => (
    date.getFullYear() + '-' + doubleStr(date.getMonth() + 1) + '-' + doubleStr(date.getDate())
);
module.exports.dateStr = dateStr;