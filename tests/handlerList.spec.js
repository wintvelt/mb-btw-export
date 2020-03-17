'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../src/helpers/test');
const testIfDb = testhelpers.testIfDbMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handler = require('../src/handlerList');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    queryStringParameters: {
        year: '2020',
    },
    pathParameters: {
        admin: adminCode
    }
}

describe("The handlerList function", testIfDb(() => {
    it("returns a list, with unexported stats + stats per exported file", async () => {
        const response = await handler.listing(event);
        let body = JSON.parse(response.body);
        console.log(body);
        expect(response.statusCode).to.be.within(200,299);
    }).timeout(20000);
}));