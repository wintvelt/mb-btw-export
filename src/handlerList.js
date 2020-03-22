'use strict';
const request = require('./helpers/request');
const stats = require('./helpers-db/stats');

module.exports.listing = async event => {
  const isBadRequest = (!event || !event.pathParameters.admin ||
    !event.headers || !event.headers.Authorization);
  if (isBadRequest) return request.response(400, "Bad request");

  const adminCode = event.pathParameters.admin;
  const year = (event.queryStringParameters && event.queryStringParameters.year) || new Date().getFullYear();

  const unexportedStats = await stats.getUnexportedStats({ adminCode });
  if (unexportedStats.error) return request.response(500, unexportedStats);

  const exportStats = await stats.queryExportStats({ adminCode });
  if (exportStats.error) return request.response(500, exportStats);

  let latest_export_create_date;
  for (let i = 0; i < exportStats.length; i++) {
    const exportFile = exportStats[i];
    if (!latest_export_create_date || exportFile.create_date > latest_export_create_date) {
      latest_export_create_date = exportFile.create_date
    }
  }
  const filteredExportStats = exportStats.filter(stat => {
    return (stat.end_date.slice(0, 4) >= year);
  });

  const hasOlder = (exportStats.length > filteredExportStats.length);

  const responseBody = {
    unexported: { ...unexportedStats, latest_export_create_date },
    files: filteredExportStats,
    hasOlder
  };
  return request.response(200, responseBody);
};
