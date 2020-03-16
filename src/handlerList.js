'use strict';

module.exports.listing = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        adminCode: event && event.pathParameters && event.pathParameters.admin,
        input: event,
      },
      null,
      2
    ),
  };
};
