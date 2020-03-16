// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const adminCode = testhelpers.adminCode;

const exportState = require('../../src/helpers-db/exportState');

const exportDocs = [
    { id: '1', date: '2020-01-09' },
    { id: '2', date: '2020-01-10' },
    { id: '3', date: '2020-01-12' },
    { id: '4', date: '2020-02-01' },
    { id: '5', date: '2020-01-01' },
    { id: '6', date: '2020-02-08' },
]

describe('Dynamo DB exporState tests', () => {
    describe('The getUnexported function', testIfDb(() => {
        it('retrieves docIds from unexported list that match the date range', async () => {
            const params = {
                adminCode,
                start_date: '2019-01-01',
            }
            const result = await exportState.getUnexported(params);
            expect(result).to.be.an('array');
        });
    }));

    describe('The makeExportStats function', () => {
        it('returns an object with stats on passed exportDocs', () => {
            const filename = 'test.xlsx';
            const myStats = exportState.makeExportStats({ exportDocs, filename });
            expect(myStats.filename).to.equal(filename);
            expect(myStats.doc_count).to.equal(6);
            expect(myStats.start_date).to.equal('2020-01-01');
            expect(myStats.end_date).to.equal('2020-02-08');
        });
    });
});
