// test for syncing moneybird data
'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDbMb = testhelpers.testIfDbMb;
const adminCode = testhelpers.adminCode;
const access_token = testhelpers.access_token;

const sync = require('../../src/helpers-sync/sync');

const context = { adminCode, access_token, year: '2020' };

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
const limitChangeSet = {
    receipts: { added: [1, 2, 3, 4, 5], changed: [6, 7, 8], deleted: [9, 10, 11] },
    purchase_invoices: { added: [], changed: [], deleted: [12] }
}

describe('Sync Functions', () => {
    describe("The changesPartial function", () => {
        const changeSet = sync.changesPartial(oldList, newList);
        it("does not contain any new items", () => {
            expect(changeSet).to.not.have.property('added');
        });
        it("contains items changed - with newer version", () => {
            expect(changeSet.changed).to.be.an('array').that.eql(['3', '4']);
        });
        it("contains deleted items - only in old list", () => {
            expect(changeSet.deleted).to.be.an('array').that.eql(['5']);
        });
    });

    describe("The changesNew function", () => {
        const changeSet = sync.changesNew(oldList, newList);
        it("contains the new items", () => {
            expect(changeSet).to.have.property('added');
            expect(changeSet.added).to.be.an('array').that.eql(['6']);
        });
        it("does not contain contains items added or deleted", () => {
            expect(changeSet).to.not.have.property('changed');
            expect(changeSet).to.not.have.property('deleted');
        });
    });

    describe("The limitChanges function", () => {
        const result = sync.limitChanges(limitChangeSet, 10);
        const { limitedChangeSet: changeSet, maxExceeded } = result;
        it("limits the changeSet to the maxUpdates threshold", () => {
            const receipts = changeSet.receipts;
            expect(maxExceeded).to.equal(true);
            expect(receipts.added).to.have.lengthOf(5);
            expect(receipts.changed).to.have.lengthOf(3);
            expect(receipts.deleted).to.have.lengthOf(2);
            expect(changeSet.purchase_invoices.deleted).to.have.lengthOf(0);
        });
    });

    describe('The getChangeSet function', testIfDbMb(() => {
        it('returns a changeSet', async () => {
            const changeSet = await sync.getChangeSet(context);
            expect(changeSet).to.have.property('receipts');
            expect(changeSet.receipts).to.have.property('added');
            expect(changeSet.receipts).to.have.property('changed');
            expect(changeSet.receipts).to.have.property('deleted');
            expect(changeSet).to.have.property('purchase_invoices');
            expect(changeSet.purchase_invoices.added).to.be.an('array');
        });
    }));

    describe('The getDocUpdates function', testIfDbMb(() => {
        it('returns docUpdates array and maxExceeded boolean', async () => {
            const result = await sync.getDocUpdates({ ...context, maxUpdates: 10 });
            expect(result).to.have.property('docUpdates');
            expect(result).to.have.property('maxExceeded');
            const { docUpdates, maxExceeded } = result;
            expect(docUpdates).to.be.an('array');
            expect(maxExceeded).to.be.a('boolean');
        });
    }));
});
