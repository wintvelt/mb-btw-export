const baseHeaders =
{
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers':
        'X-Requested-With, X-HTTP-Method-Override, Content-Type, Authorization, Origin, Accept'

};

module.exports.response = (statusCode, bodyOrString) => {
    const body = typeof bodyOrString === 'string' ?
        JSON.stringify({ message: bodyOrString }, null, 2)
        : JSON.stringify(bodyOrString, null, 2);
    if (statusCode < 200 || statusCode > 299) {
        console.log({ statusCode, body });
    }
    return {
        headers: baseHeaders,
        statusCode,
        body
    }
}

module.exports.errorLog = (message, error) => {
    console.log(`${message} - ${JSON.stringify(error)}`);
    return error;
}