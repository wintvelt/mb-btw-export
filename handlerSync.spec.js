const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const handler = require('./handlerSync');

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
    }
}

describe("The handlerSync function", testIf(() => {
    it("does a sync", async () => {
        const response = await handler.main(event);
        let body = JSON.parse(response.body);
        console.log(body);
    }).timeout(20000);
}));