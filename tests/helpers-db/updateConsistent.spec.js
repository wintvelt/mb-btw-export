// for testing (duh)
const chai = require('chai');
const expect = chai.expect;
const testhelpers = require('../../src/helpers/test');
const testIfDb = testhelpers.testIfDb;
const removeFromDb = testhelpers.removeFromDb;

const updateConsistent = require('../../src/helpers-db/updateConsistent');
const update = require('../../src/helpers-db/update');

const adminCode = '9999';
const initialTimeStamp = '14:30';
const testKeys = { adminCode, stateName: 'latestState', id: '1234', timeStamp: initialTimeStamp };
const testKeys2 = { adminCode, stateName: 'unexported', id: '1234', timeStamp: initialTimeStamp };

const baseState = version => ({
    type: 'receipt',
    version,
    date: '2020-01-08'
});
const baseItemUpdates = (version, timeStamp) => ([
    { itemName: 'state', newState: baseState(version) },
    { itemName: 'timeStamp', newState: timeStamp },
])

const testDoc = { ...testKeys, itemUpdates: baseItemUpdates(12, initialTimeStamp) }
const testDocParams = update.singleWithItemsParams(testDoc);
const testDoc2 = { ...testKeys2, itemUpdates: baseItemUpdates(12, initialTimeStamp) }
const testDocParams2 = update.singleWithItemsParams(testDoc2);
const testDoc2Update = { ...testKeys2, itemUpdates: baseItemUpdates(14, '15:20') }
const updateParams2 = update.singleWithItemsParams(testDoc2Update);

describe('The DB updateConsistent tests', testIfDb(() => {
    after(async () => {
        await removeFromDb(testKeys);
        await removeFromDb(testKeys2);
    });
    describe('The transact function', () => {
        it('creates item in Db', async () => {
            const updates = [testDocParams];
            const result = await updateConsistent.transact({ updates });
            expect(result).to.be.an('object');
            expect(result).to.be.empty;
        });
        it('returns ok if timestamp on original matches', async () => {
            const updates = [testDocParams2];
            const stateCheck = testKeys;
            const result = await updateConsistent.transact({ updates, stateCheck });
            expect(result).to.be.an('object');
            expect(result).to.be.empty;
        });
        it('returns ok if timestamp does not match - because it re-reads', async () => {
            const updates = [testDocParams2];
            const stateCheck = { ...testKeys, timeStamp: '16:30' };
            const result = await updateConsistent.transact({ updates, stateCheck });
            expect(result).to.be.an('object');
            expect(result).to.be.empty;
        });
    });
}));
