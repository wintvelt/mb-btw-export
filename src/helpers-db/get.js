// helpers-db/get.js
// to retrieve a single DynamoDB record
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const errorLog = require('../helpers/request').errorLog;

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});


const getParams = ({ adminCode, id, stateName }) => {
    const params = {
        TableName,
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        }
    };
    return params
};

module.exports.get = ({ adminCode, id, stateName }) => {
    const params = getParams({ adminCode, id, stateName });
    return dynamoDb.get(params)
        .promise()
        .then(res => res.Item)
        .catch(error => {
            const err = { error: error.message };
            return errorLog(`could not retrieve Db @state ${stateName} @id ${id}`, err);
        });
};