'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('./helpers/test');
const testIfDbMb = testhelpers.testIfDbMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const handler = require('./handlerExport');

const event = {
    headers: {
        Authorization: `Bearer ${access_token}`
    },
    pathParameters: {
        admin: adminCode
    },
    body: {
        start_date: '2020-01-20',
        end_date: '2020-01-20'
    }
}

describe("The handlerExport function", testIfDbMb(() => {
    it("creates an export excel file and updates the databases", async () => {
        const response = await handler.main(event);
        expect(response.statusCode).to.be.within(200,299);
    }).timeout(20000);
}));