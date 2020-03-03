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
    describe("The changesPartial function", () => {
        const changeSet = sync.changesPartial(oldList, newList);
        it("does not contains any new items", () => {
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

    describe('The getChangeSet', () => {
        it('returns a changeSet', async () => {
        });
    })
})
