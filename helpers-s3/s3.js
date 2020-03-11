'use strict'
var { S3 } = require('aws-sdk');

var s3 = new S3({
    region: 'eu-central-1'
});

module.exports.save = ({ bucketName, filename, content, contentType }) => {
    const saveParams = {
        ACL: 'public-read',
        Bucket: bucketName,
        Key: filename,
        Body: content,
        ContentType: contentType,
    }
    return s3.putObject(saveParams).promise()
        .catch(error => ({ error: error.statusCode + ' - ' + error.message }))
}




