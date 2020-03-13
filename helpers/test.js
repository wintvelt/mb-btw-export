// helpers for testing
require('dotenv').config();
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testMb = (process.env.TEST_MB_ON && process.env.TEST_MB_ON !== "false");

module.exports.adminCode = process.env.ADMIN_CODE;
module.exports.access_token = process.env.ACCESS_TOKEN;

module.exports.testIfDb = (testFunc) => {
    if (testDb) return testFunc;
    return () => {
        it('database tests did not run', () => { });
    }
}

module.exports.testIfMb = (testFunc) => {
    if (testMb) return testFunc;
    return () => {
        it('moneybird tests did not run', () => {});
    }
}

module.exports.testIfDbMb = (testFunc) => {
    if (testMb && testDb) return testFunc;
    const mbString = testMb? '': 'moneybird';
    const dbString = testDb? '': 'database';
    const andString = (!testMb && !testDb)? ' and ' : '';
    return () => {
        it(`${mbString}${andString}${dbString} tests off, so sync tests did not run`, () => {});
    }
}

module.exports.addToDb = async ({ adminCode, stateName, id, state }) => {
    const params = {
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        },
        UpdateExpression: 'SET #state = :newState',
        ExpressionAttributeNames: {
            '#state': 'state',
        },
        ExpressionAttributeValues: {
            ':newState': state
        },
        TableName,
        ReturnValues: 'ALL_NEW'
    }
    return dynamoDb.update(params)
        .promise()
        .then(res => res.Attributes)
        .catch(error => ({ error: error.message }));
}

module.exports.removeFromDb = async ({ adminCode, stateName, id }) => {
    const params = {
        Key: {
            adminCodeState: adminCode + stateName,
            id,
        },
        TableName,
        ReturnValues: 'NONE'
    }
    return dynamoDb.delete(params)
        .promise()
        .catch(error => ({ error: error.message }));
}