// helpers-db/update.js
// to do a consistent update with check
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const errorLog = require('../helpers/request').errorLog;

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

module.exports.conditionCheck = ({ adminCode, stateName, id, timeStamp }) => {
    return {
        ConditionCheck: {
            Key: {
                adminCodeState: adminCode + stateName,
                id
            },
            ConditionExpression: '#ts = :ts',
            ExpressionAttributeNames: { '#ts': 'timeStamp' },
            ExpressionAttributeValues: { ':ts': timeStamp },
            TableName
        }
    }
}

const transactSingle = ({ conditionCheck, updates }) => {
    const TransactItems = (conditionCheck) ?
        [conditionCheck, ...updates]
        : [...updates];
    return dynamoDb.transactWrite({
        TransactItems
    })
        .promise()
        .catch(error => errorLog('could not update DB', { error: error.message }))
}

const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.transact = async ({ conditionCheck, updates }) => {
    let retryIntervals = [0, 400, 1000];
    let result;
    do {
        [result] = await Promise.all([
            transactSingle({ conditionCheck, updates }),
            timeout(retryIntervals[0])
        ]);
        retryIntervals = retryIntervals.slice(1);
    } while (result.error && retryIntervals.length > 0);
    return result;
}