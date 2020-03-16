'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('./helpers/test');
const testIfDb = testhelpers.testIfDbMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handler = require('./handlerDelete');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    pathParameters: {
        admin: adminCode,
        filename: 'btw-export 2020-03-15 23u51m27s.xlsx'
    }
}

describe("The handlerDelete function", testIfDb(() => {
    it("deletes an export from the databases and deletes S3 file", async () => {
        const response = await handler.main(event);
        expect(response.statusCode).to.be.within(200,299);
    }).timeout(20000);
}));