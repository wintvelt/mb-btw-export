'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('./helpers/test');
const testIfMb = testhelpers.testIfMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handler = require('./handlerSync');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    pathParameters: {
        admin: adminCode
    }
}

describe("The handlerSync function", testIfMb(() => {
    it("does a sync", async () => {
        const response = await handler.main(event);
        expect(response.statusCode).to.equal(200);
    }).timeout(20000);
}));