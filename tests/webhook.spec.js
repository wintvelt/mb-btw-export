'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../src/helpers/test');
const testIfDbMb = testhelpers.testIfDbMb;

const webhook = require('../src/webhook');
const update = require('../src/helpers-db/update');

const baseBody = {
    administration_id: "testadmin",
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

const realBody = {
    administration_id: '243231934476453244',
    webhook_id: '283213370796017071',
    webhook_token: 'sfvkrsUp3WWHoetvUAt1q1pK',
    entity_type: 'PurchaseInvoice',
    entity_id: '283215842682865212',
    state: 'open',
    action: 'document_updated',
    entity: {
        id: '283215842682865212',
        administration_id: '243231934476453244',
        contact_id: '243578697978742549',
        contact: [Object],
        reference: 'TESTFACTUUR',
        date: '2020-03-16',
        due_date: null,
        entry_number: 249,
        state: 'open',
        currency: 'EUR',
        exchange_rate: '1.0',
        revenue_invoice: false,
        prices_are_incl_tax: true,
        origin: null,
        paid_at: null,
        tax_number: '',
        total_price_excl_tax: '200.0',
        total_price_excl_tax_base: '200.0',
        total_price_incl_tax: '200.0',
        total_price_incl_tax_base: '200.0',
        created_at: '2020-03-15T23:41:36.886Z',
        updated_at: '2020-03-15T23:57:08.358Z',
        version: 1584316628,
        details: [
            {
                "id": "283215878729762413",
                "administration_id": "243231934476453244",
                "tax_rate_id": "243232725503313338",
                "ledger_account_id": "243231934638982456",
                "project_id": null,
                "product_id": null,
                "amount": "1 x",
                "amount_decimal": "1.0",
                "description": "terugbetaling garantie",
                "price": "200.0",
                "period": null,
                "row_order": 0,
                "total_price_excl_tax_with_discount": "200.0",
                "total_price_excl_tax_with_discount_base": "200.0",
                "tax_report_reference": [],
                "created_at": "2020-03-15T23:42:11.263Z",
                "updated_at": "2020-03-15T23:57:08.354Z"
            }
        ],
        payments: [],
        notes: [],
        attachments: [],
        events: []
    }
};

const realEvent = {
    pathParameters: { admin: realBody.administration_id },
    httpMethod: 'POST',
    body: JSON.stringify(realBody)
};


describe("The webhook function", testIfDbMb(() => {
    it("returns with statusCode of 200 with testevent", async () => {
        const response = await webhook.main(baseEvent(baseBody));
        expect(response.statusCode).to.equal(200);
    });
    it("updates database and returns statusCode of 200 with real event", async () => {
        const response = await webhook.main(realEvent);
        expect(response.statusCode).to.equal(200);
    });
    it("returns with statusCode of 400 if body is missing", async () => {
        const { body, ...eventWithoutBody } = baseEvent(baseBody);
        const response = await webhook.main(eventWithoutBody);
        expect(response.statusCode).to.equal(400);
    });
    it("updates database and returns statusCode of 200 with real deletion event", async () => {
        const realDeletionBody = { ...realBody, action: 'document_destroyed', entity: null };
        const realDeletionEvent = { ...realEvent, body: JSON.stringify(realDeletionBody) };
        const response = await webhook.main(realDeletionEvent);
        expect(response.statusCode).to.equal(200);
    });
    after(async () => {
        const baseParams = { adminCode: baseBody.administration_id, id: baseBody.entity_id };
        await update.delete({ ...baseParams, stateName: 'latestState' });
        const realParams = { adminCode: realBody.administration_id, id: realBody.entity_id };
        await update.delete({ ...realParams, stateName: 'latestState' });
        await update.delete({ ...realParams, stateName: 'unexported' });
    })
})).timeout(10000);