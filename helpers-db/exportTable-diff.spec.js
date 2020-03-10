// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
// require('dotenv').config();

const exportTableDiff = require('./exportTable-diff');

// const testEnv = {
//     DYNAMODB_TABLE_DOCS: 'btw-export-dev-docs',
//     DYNAMODB_TABLE_EXPORTS: 'btw-export-dev-exports',
// };
// const adminCode = process.env.ADMIN_CODE;

// const testDb = (process.env.TEST_DB_ON && process.env.TEST_DB_ON !== "false");
// const testIf = (testFunc) => {
//     if (testDb) return testFunc;
//     return () => {
//         it('database tests did not run', () => { });
//     }
// }

const newState = {
    details: [
        { tax_rate_id: 'tax1', ledger_account_id: 'acc1', total_price_excl_tax_with_discount_base: '143.3' },
        { tax_rate_id: 'tax2', ledger_account_id: 'acc2', total_price_excl_tax_with_discount_base: '50' },
    ]
}

const oldState1 = {
    details: [
        { tax_rate_id: 'tax1', ledger_account_id: 'acc1', total_price_excl_tax_with_discount_base: '190' },
    ]
}
const oldState2 = {
    details: [
        { tax_rate_id: 'tax1', ledger_account_id: 'acc1', total_price_excl_tax_with_discount_base: '143.3' },
    ]
}
const oldState3 = {
    details: [
        { tax_rate_id: 'tax3', ledger_account_id: 'acc1', total_price_excl_tax_with_discount_base: '190' },
    ]
}

describe('exportTable-diff tests', () => {
    describe('The diff function', () => {
        it('adds all details as new if oldState is empty', () => {
            const result = exportTableDiff.diff(null, newState);
            expect(result[0].change).to.equal('added');
            expect(result[1].change).to.equal('added');
        });
        it('adds a changed record if the amount changed', () => {
            const result = exportTableDiff.diff(oldState1, newState);
            expect(result[0].change).to.equal('changed');
            expect(result[0].amount).to.equal(-46.70);
        });
        it('does not add a record if the amount did not change', () => {
            const result = exportTableDiff.diff(oldState2, newState);
            const wrongLine = result.filter(line => line.tax_rate_id === 'tax1');
            expect(wrongLine).to.have.lengthOf(0);
        });
        it('adds a deleted record if the old amount is not in new', () => {
            const result = exportTableDiff.diff(oldState3, newState);
            const deletedLine = result.find(line => line.tax_rate_id === 'tax3');
            expect(deletedLine.change).to.equal('deleted');
            expect(deletedLine.amount).to.equal(-190);
        });
        it('adds all deleted if the new state isDeleted', () => {
            const result = exportTableDiff.diff(newState, { isDeleted: true });
            expect(result[0].amount).to.equal(-143.3);
            expect(result[0].change).to.equal('deleted');
            expect(result[1].amount).to.equal(-50);
            expect(result[1].change).to.equal('deleted');
        });
    });
});
