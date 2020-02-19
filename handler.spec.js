const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const handler = require('./handlerList');

describe("The handler function", () => {
    it("returns a message", async () => {
        const response = await handler.listing(undefined);
        let body = JSON.parse(response.body);
        expect(body.message).to.equal('Go Serverless v1.0! Your function executed successfully!');
    });
});