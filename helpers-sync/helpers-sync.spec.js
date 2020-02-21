// test for syncing moneybird data
'use strict';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const sync = require('./sync');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN
}

describe('The sync.promise function',() => {
    it('retrieves set of doc ids from moneybird sync', async () => {
        const response = await sync.promise(context);
        expect(response).to.have.property('receipts');
        expect(response.receipts).to.have.property('added');
    });
    it('returns an error if credentials are not ok', async () => {
        const wrongCreds = { ...context, access_token: 'wrong' };
        const response = await sync.promise(wrongCreds);
        expect(response).to.have.property('error');
    });
})

