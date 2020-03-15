// for testing (duh)
const chai = require('chai');
const expect = chai.expect;

const diff = require('./unexported-diff');

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

describe('The DB unexported-diff.diff function', () => {
    it('adds all details as new if oldState is empty', () => {
        const result = diff.diff(null, newState);
        expect(result[0].change).to.equal('added');
        expect(result[1].change).to.equal('added');
    });
    it('adds a changed record if the amount changed', () => {
        const result = diff.diff(oldState1, newState);
        expect(result[0].change).to.equal('changed');
        expect(result[0].amount).to.equal(-46.70);
    });
    it('does not add a record if the amount did not change', () => {
        const result = diff.diff(oldState2, newState);
        const wrongLine = result.filter(line => line.tax_rate_id === 'tax1');
        expect(wrongLine).to.have.lengthOf(0);
    });
    it('adds a deleted record if the old amount is not in new', () => {
        const result = diff.diff(oldState3, newState);
        const deletedLine = result.find(line => line.tax_rate_id === 'tax3');
        expect(deletedLine.change).to.equal('deleted');
        expect(deletedLine.amount).to.equal(-190);
    });
    it('adds all deleted if the new state isDeleted', () => {
        const result = diff.diff(newState, { isDeleted: true });
        expect(result[0].amount).to.equal(-143.3);
        expect(result[0].change).to.equal('deleted');
        expect(result[1].amount).to.equal(-50);
        expect(result[1].change).to.equal('deleted');
    });
});
