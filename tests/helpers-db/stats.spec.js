'use strict';
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;

const stats = require('../../src/helpers-db/stats');

describe("DB stats tests", testIfDb(() => {
    describe('The getUnexportedStats function', async () => {
        it("returns stats of unexported docs", async () => {
            const result = await stats.getUnexportedStats({ adminCode });
            expect(result).to.have.property('new_docs_after_export_count');
            expect(result).to.have.property('new_docs_before_export_count');
            expect(result).to.have.property('changed_docs');
            expect(result).to.have.property('deleted_docs');
            expect(result).to.have.property('start_date');
            expect(result).to.have.property('end_date');
            expect(result).to.have.property('doc_count');
            const doc_count_sum =
                result.new_docs_after_export_count +
                result.new_docs_before_export_count +
                result.changed_docs +
                result.deleted_docs;
            expect(result.doc_count).to.equal(doc_count_sum);
        });
    });

    describe('The queryExportStats function', async () => {
        it("returns list of stats exported docs", async () => {
            const result = await stats.queryExportStats({ adminCode });
            expect(result).to.be.an('array');
            if (result.length > 0) {
                const firstResult = result[0];
                expect(firstResult).to.have.property('filename');
                expect(firstResult).to.have.property('url');
                expect(firstResult).to.have.property('create_date');
                expect(firstResult).to.have.property('start_date');
                expect(firstResult).to.have.property('end_date');
            }
        });
    });
}));