'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handlerVerify = require('../src/handlerVerify');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    pathParameters: {
        admin: adminCode
    },
    body: {
        start_date: '2020-01-01',
        end_date: '2020-01-31'
    }
}

describe("The handlerVerify function", testIfDb(() => {
    it("returns integrity issues from the DB with ExclusiveStartKey", async () => {
        const response = await handlerVerify.main(event);
        expect(response.statusCode).to.be.within(200, 299);
    }).timeout(20000);
}));