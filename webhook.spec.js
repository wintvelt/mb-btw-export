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
    pathParameters: { admin: process.env.ADMIN_CODE },
    httpMethod: 'POST',
    body: JSON.stringify(body)
});

describe("The webhook function", () => {
    it('HAS NO TESTS YET', () => {});
    // it("returns with statusCode of 200", async () => {
    //     const response = await webhook.main(baseEvent(baseBody));
    //     expect(response.statusCode).to.equal(200);
    // });
    // it("returns with statusCode of 401 if body is missing", async () => {
    //     const { body, ...eventWithoutBody } = baseEvent(baseBody);
    //     const response = await webhook.main(eventWithoutBody);
    //     expect(response.statusCode).to.equal(401);
    // });
});