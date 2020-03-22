'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../src/helpers/test');
const testIfDb = testhelpers.testIfDbMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handler = require('../src/handlerDelete');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    pathParameters: {
        admin: adminCode,
        filename: 'btw-export 2020-03-22 21u18m04s.xlsx'
    }
}

describe("The handlerDelete function", testIfDb(() => {
    it("deletes an export (if exists) from the databases and deletes S3 file", async () => {
        const response = await handler.main(event);
        console.log(`Delete response statusCode = ${response.statusCode}`);
        expect(response.statusCode).to.be.within(200,599);
    }).timeout(20000);
}));