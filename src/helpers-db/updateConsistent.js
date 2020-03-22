// helpers-db/update.js
// to do a consistent update with check
'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const errorLog = require('../helpers/request').errorLog;
const get = require('./get');

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const conditionCheckParams = ({ adminCode, id, timeStamp }) => {
    return {
        ConditionCheck: {
            Key: {
                adminCodeState: adminCode + 'latestState',
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

module.exports.transact = async ({ stateCheck, updates }) => {
    let conditionCheck = stateCheck? conditionCheckParams(stateCheck) : null;
    let retryIntervals = [0, 400, 1000];
    let result;
    do {
        [result] = await Promise.all([
            transactSingle({ conditionCheck, updates }),
            timeout(retryIntervals[0])
        ]);
        if (result.error && result.error.includes('ConditionalCheckFailed')) {
            const newStateCheck = await get.get(stateCheck);
            conditionCheck = conditionCheckParams(newStateCheck);
        }
        retryIntervals = retryIntervals.slice(1);
    } while (result.error && retryIntervals.length > 0);
    return result;
}