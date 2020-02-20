// helpers-db/update.spec.js
// for testing (duh)
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;

const update = require('./update');

const testEnv = {
    DYNAMODB_TABLE: 'btw-export-dev'
};

describe('The update/promise function', () => {
    const latest_state = {
        type: 'receipt',
        version: 12345,
        date: '2020-01-08'
    }
    const params = { id: '1234', latest_state }
    const context = { tableName: testEnv.DYNAMODB_TABLE }
    it('stores stuff', async () => {
        const response = await update.promise(params, context);
        const { Attributes } = response;
        expect(response).to.have.property('Attributes');
        expect(Attributes).to.have.property('id');
        expect(Attributes.latest_state).to.have.property('type');
        expect(Attributes.latest_state.type).to.equal('receipt');
    });
    it('throws error if tablename is wrong', async () => {
        const response = await update.promise(params, { tableName: 'wrong' });
        expect(response).to.have.property('error');
    })
})