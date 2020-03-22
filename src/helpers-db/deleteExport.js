'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const TableName = process.env.DYNAMODB_DOC_TABLE || 'btw-export-dev-docs';
const IndexName = 'stateIndex';

const query = require('./query');

const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'eu-central-1'
});

const queryParams = {
    ProjectionExpression: "adminCode, stateName, id",
    KeyConditionExpression: '#ac = :ac and begins_with(stateName, :exportName) ',
    ExpressionAttributeNames: {
        '#ac': 'adminCode'
    },
    ScanIndexForward: false,
    TableName,
    IndexName
};

const queryIndexOnce = ({ adminCode, ExclusiveStartKey }) => {
    return dynamoDb.query({
        ...queryParams,
        ExpressionAttributeValues: {
            ':ac': adminCode,
            ':exportName': 'btw-export'
        },
        ExclusiveStartKey
    })
        .promise()
        .catch(error => ({ error: error.message }));
};
module.exports.queryIndexOnce = queryIndexOnce;

module.exports.getLatestExport = ({ adminCode }) => {
    return queryIndexOnce({ adminCode })
        .then(result => {
            const { Items } = result;
            return (Items && Items.length > 0) ?
                Items[0].stateName
                : '';
        })
};

const deleteExportedDocParams = ({ adminCode, stateName, id }) => {
    return {
        Delete: {
            TableName,
            Key: {
                adminCodeState: adminCode + stateName,
                id
            },
            ReturnValue: 'ALL_OLD'
        }
    };
};
module.exports.deleteExportedDocParams = deleteExportedDocParams;

module.exports.deleteExportedDoc = ({ adminCode, stateName, id }) => {
    const params = deleteExportedDocParams({ adminCode, stateName, id });
    return dynamoDb.delete(params.Delete)
        .promise()
        .catch(error => ({ error: error.message }));
};

module.exports.getExportedDocs = async ({ adminCode, exportName }) => {
    let exportedDocs = [];
    let ExclusiveStartKey;
    let queryError;
    do {
        const result = await query.queryOnce({
            adminCode,
            stateName: exportName,
            ExclusiveStartKey
        });
        if (result.error) {
            queryError = { error: result.error }
        } else {
            const { Items, LastEvaluatedKey } = result;
            exportedDocs = [...exportedDocs, ...Items];
            ExclusiveStartKey = LastEvaluatedKey;
        };
    } while (ExclusiveStartKey && !queryError);
    if (queryError) return queryError;
    return exportedDocs.filter(doc => doc.id !== 'exportStats');
}
