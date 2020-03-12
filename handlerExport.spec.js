const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const handler = require('./handlerExport');

const testMb = (process.env.TEST_MB_ON && process.env.TEST_MB_ON !== "false");
const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testIf = (testFunc) => {
    if (testMb && testDb) return testFunc;
    const mbString = testMb? '': 'moneybird';
    const dbString = testDb? '': 'database';
    const andString = (!testMb && !testDb)? ' and ' : '';
    return () => {
        it(`${mbString}${andString}${dbString} tests off, so sync tests did not run`, () => {});
    }
}

const event = {
    headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
    },
    pathParameters: {
        admin: process.env.ADMIN_CODE
    },
    body: {
        start_date: '2019-01-01',
        // end_date: '2020-01-20'
    }
}

describe("The handlerExport function", testIf(() => {
    it("creates an export excel file and updates the databases", async () => {
        const response = await handler.main(event);
        console.log(response);
        expect(response.statusCode).to.be.within(200,299);
    }).timeout(20000);
}));