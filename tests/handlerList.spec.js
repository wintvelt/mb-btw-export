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
        const response = await handler.main(event);
        expect(response.statusCode).to.be.within(200,299);
    }).timeout(20000);
}));

describe("The handlerList function", () => {
    it("returns a message", async () => {
        const response = await handler.listing(undefined);
        expect(response.statusCode).to.be.within(200,299);
        let body = JSON.parse(response.body);
        expect(body.message).to.equal('Go Serverless v1.0! Your function executed successfully!');
    });
});