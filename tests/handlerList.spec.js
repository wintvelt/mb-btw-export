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
        expect(response.statusCode).to.be.within(200,299);
        let body = JSON.parse(response.body);
        expect(body).to.have.property('unexported');
        expect(body).to.have.property('files');
        expect(body).to.have.property('hasOlder');
    });

    it("for a future year, returns an empty files list", async () => {
        const futureYearEvent = {
            ...event,
            queryStringParameters: {
                year: '2028'
            }
        }
        const response = await handler.listing(futureYearEvent);
        expect(response.statusCode).to.be.within(200,299);
        let body = JSON.parse(response.body);
        expect(body.files).to.have.lengthOf(0);
    });
}));