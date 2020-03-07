require('dotenv').config();

const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const webhook = require('./webhook');

const baseBody = {
    administration_id: "116015326147118082",
    entity_type: "Receipt",
    entity_id: "116015245643744263",
    action: "some_action",
    entity: {
      id: "116015245643744263"
    }
};
const baseEvent = (body) => ({
    pathParameters: { admin: 'testadmin' },
    httpMethod: 'POST',
    body: JSON.stringify(body)
});

const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
const testIf = (testFunc) => {
    if (testDb) return testFunc;
    return () => {
        it('database tests did not run', () => {});
    }
}

describe("The webhook function", testIf(() => {
    it("returns with statusCode of 200", async () => {
        const response = await webhook.main(baseEvent(baseBody));
        expect(response.statusCode).to.equal(200);
    });
    it("returns with statusCode of 400 if body is missing", async () => {
        const { body, ...eventWithoutBody } = baseEvent(baseBody);
        const response = await webhook.main(eventWithoutBody);
        expect(response.statusCode).to.equal(400);
    });
}));