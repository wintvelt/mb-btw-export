'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;

const deleteExport = require('./deleteExport');

describe("DB deleteExport tests", testIfDb(() => {
    describe('The queryIndexOnce function', async () => {
        it("returns a list of all exports", async () => {
            const result = await deleteExport.queryIndexOnce({ adminCode });
            expect(result).to.have.property('Items');
            expect(result.Items).to.be.an('array');
            if (result.Items.length > 0) {
                expect(result.Items[0]).to.have.property('stateName');
            }
        });
    });
    describe('The getLatestExport function', () => {
        it("returns a list of all exports", async () => {
            const result = await deleteExport.getLatestExport({ adminCode });
            expect(result).to.be.a('string');
        });
    });
}));