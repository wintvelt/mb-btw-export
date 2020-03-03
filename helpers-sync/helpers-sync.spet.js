// test for syncing moneybird data
'use strict';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
require('dotenv').config();

const sync = require('./sync');

const context = {
    adminCode: process.env.ADMIN_CODE,
    access_token: process.env.ACCESS_TOKEN,
    TableName: 'btw-export-dev-docs'
}

const oldList = [
    { id: '1', version: '1' },
    { id: '2', version: '1' },
    { id: '3', version: '1' },
    { id: '4', version: '1' },
    { id: '5', version: '1' }
];
const newList = [
    { id: '1', version: '1' },
    { id: '2', version: '1' },
    { id: '3', version: '3' },
    { id: '4', version: '2' },
    { id: '6', version: '1' }
];

describe('Sync Functions', () => {
    describe('The sync.mbTypeSync function', () => {
        it('retrieves set of doc ids from moneybird sync', async () => {
            const response = await sync.mbTypeSync({ ...context, type: 'receipts' });
            expect(response).to.be.an('array');
        });
        it('returns an error if credentials are wrong', async () => {
            const wrongCreds = { ...context, access_token: 'wrong', type: 'receipts' };
            const response = await sync.mbTypeSync(wrongCreds);
            expect(response).to.be.have.property('error');
        })
    });

    describe('The sync.mbSync function', () => {
        it('returns an object with receipts and purchase invoices id, versions', async () => {
            const response = await sync.mbSync(context);
            expect(response).to.have.property('receipts');
            expect(response.receipts).to.be.an('array');
            expect(response.receipts[0]).to.have.property('version');
        });
        it('returns an error if creds are wrong', async () => {
            const wrongCreds = { ...context, access_token: 'wrong' };
            const response = await sync.mbSync(wrongCreds);
            expect(response).to.be.have.property('error');
        })
    })

    describe("The sync.changes function", () => {
        const changeSet = sync.changes(oldList, newList);
        it("contains the new items - only in new list", () => {
            expect(changeSet.added).to.be.an('array').that.eql(['6']);
        });
        it("contains items changed - with newer version", () => {
            expect(changeSet.changed).to.be.an('array').that.eql(['3', '4']);
        });
        it("contains deleted items - only in old list", () => {
            expect(changeSet.deleted).to.be.an('array').that.eql(['5']);
        });
    });

    describe('The getSyncUpdates function', () => {
        it('returns an object with docUpdates', async () => {
            const result = await sync.getSyncUpdates({ ...context, maxUpdates: 40 });
            expect(result).to.have.property('docUpdates');
            expect(result.docUpdates).to.be.an('array');
        });
        it('has maxExceeded = true if more than max results | false if less', async () => {
            const result = await sync.getSyncUpdates({ ...context, maxUpdates: 10 });
            console.log(result.docUpdates[0]);
            expect(result.docUpdates).to.be.an('array');
            if (result.docUpdates.length >= 10) {
                expect(result.maxExceeded).to.be.true;
            } else {
                expect(result.maxExceeded).to.be.false;
            }
        });
    })
})
