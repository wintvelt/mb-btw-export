'use strict'
var { S3 } = require('aws-sdk');

var s3 = new S3({
    region: 'eu-central-1'
});

const bucketName = process.env.PUBLIC_BUCKETNAME || 'moblybird-folders';
const folderName = process.env.FOLDER_NAME || 'public';

module.exports.save = ({ adminCode, filename, content, contentType }) => {
    const saveParams = {
        ACL: 'public-read',
        Bucket: bucketName,
        Key: `${folderName}/${adminCode}/btw-export/${filename}`,
        Body: content,
        ContentType: contentType,
    }
    return s3.putObject(saveParams).promise()
        .catch(error => ({ error: error.statusCode + ' - ' + error.message }))
}

module.exports.delete = ({ adminCode, filename }) => {
    const params = {
        Bucket: bucketName,
        Key: `${folderName}/${adminCode}/btw-export/${filename}`
    }
    return s3.deleteObject(params).promise()
        .catch(error => ({ error: error.statusCode + ' - ' + error.message }))
}



