# BTW-export

This is work in progress. Not yet ready for public consumption.
TODO:
- [x] Setup DynamoDB Table in serverless.yml for state data and export history
- [x] function to update DynamoDB Table with latest Moneybird state - single
- [x] dynamoDB update function for multiple updates
- [x] function to fetch latest info from Moneybird, using id-list structure
- [x] function to update a single db item with latest (update or deleted) or exportState (change helpers-db/update)
    - check helpers-sync/getSyncUpdates for input format
- [x] function (with input = single id db record) to update an single id in unexported in exportsTable (update helpers-db/update)
    - add id and state
    - for deleted, add type and date from latest export state
- [x] sync function now makes complete changeSet (with input from db and moneybird)

- [x] tests for getChangeSet
- [x] create sync function that creates docUpdates based on changeset (up to max)
    - [x] upgrade limitedChangeSet function in sync
    - [x] add tests for limitedChangeSet
- [x] create function for single latestState update for both db-docs and db-exports table
- [x] what if latestState = deleted for record that was never exported?
    - for docTable this is fine: record is created with only latestState = { isDeleted }
    - for exportTable: fixed
- [x] update webhook for new db structure, to do single update

- [x] create `/btw-export/[admin-id]/sync` POST endpoint
- [x] create fix to update exports table unexported with latest state from docs table

- [x] implement `/btw-export/[admin-id]/export` POST endpoint
    - [x] add diffing algorithm for latestState -/- lastExportedState
    - [x] add selection of unexported states based on start-date and end-date (json)
    - [x] add create and S3-save of excel-file with new state info
        - [x] add create xls buffer
        - [x] create S3 bucket/ folder for btw-export xlsx files (still in old bucket)
    - [x] implements endpoint handler for exports
        - [x] function to add the latestState of docRecords to 1 new exported record (1 update)
        - [x] function to remove all ids from the unexported state (1 update) - add to exportTable:removeExported
        - [x] function to add the exported latestState to all individual docs (many updates) docTable.updateSingle

    - [x] refactor-db2
        - [x] changes yml structure + dynamo structure into docTable + index
        - [x] updateSingle item latestState + unexported of single item
        - [x] sync udpated
        - [x] updates webhook
        - [x] updates export functions
        - [x] implement delete export
            - [x] query index to get latest export
            - [x] query latestState for each id
            - [x] for each item in export:
                - [x] delete item from table
                - [x] update latest state: delete export from exportLogs
                - [x] determine new unexported state
    - [x] reregister webhook
    - [x] check and implement webhook document deletion
    - [x] implement sync date dependent

    - [x] adds stats to export (not to unexported or latestState BTW)
        - [x] in exportState function to store additional record with id = 'summary'
        - [x] in handlerDelete ensure that summary is filtered from id-list, but is included in deletion


- [ ] check performance of new setup
- [ ] improve max volume for exports
    - [ ] cut exportTable update into chunks of 50 (watch for race conditions)
    - [ ] bundle id states in lists per weekday
    - [ ] exported states per id as JSON.strings

- [ ] create `/btw-export/[admin-id] GET`
    - [ ] implement stats function for 1 exportTable record (unexported)
    - [ ] implement query for all exportTable records
    - [x] implement latestExportDate in stats

API to sync and connect with Moneybird.
Specifically to process purchase invoices and receipts for the purpose of VAT reporting.

## Background
By default, Moneybird does not provide any reporting that takes exports or snapshots into account.
In Moneybird, purchase invoices and receipts may be changed at any time. Which is great, but not so good for reporting. Changes to a document after it has been exported may get lost.

#### An example of the issue
- In January, a receipt is added, with 21% VAT.
- End of January, a report is generated (for submission to tax authority) that contains all receipts, summarized per VAT rule.
- In February, the VAT rule on the January receipt is changed to 0%.
- End of February, the report for tax purposes should include the correction. However, *standard Moneybird cannot report such corrections adequately*

## Enter BTW-export API
This function allows to create an export from a Moneybird administration, with the following options:
- with or without a specific start date (if no start date provided, start of the current year will be used)
- with or without end date
- standard diff report (showing only new and changed from prior exports) or full report (taking all documents as basis)

The export created will include changes since the previous exports too, to make sure that the exported state continues to be in sync with the state of Moneybird.

---

## API
All endpoints require `headers` with Moneybird Auth Bearer token
```json
{ "Authorization" : "Bearer xxxxxxx" }
```

### `/btw-export/[admin-id]` GET
To retrieve history and summary of VAT exports.

Returns files with start and end date (invoice dates) in current year only. To overrule this behavior, add e.g. `?year=2019` to also include files from earlier year(s).

Response body structure:
```json
{
    "unexported": {
        "new_docs_after_export_count": 12,
        "new_docs_before_export_count": 4,
        "changed_docs": 8,
        "deleted_docs": 2,
        "start_date": "2019-01-01",
        "end_date": "2019-01-31",
        "doc_count": 75
    },
    "files": [
        {
            "filename": "btw-export 2019-01-31 13u08m23s full.xlsx", 
            "url": "...",
            "create_date": "2019-02-08",
            "start_date": "2019-01-01",
            "end_date": "2019-01-31",
            "doc_count": 75
        },
        { 
            "filename": "btw-export 2019-02-28 14u09m00s new.xlsx", 
            "url": "...",
            "create_date": "20190306",
            "start_date": "20190101",
            "end_date": "20190228",
            "doc_count": 22
        }
    ]
}
```

### `/btw-export/[admin-id]/export` POST
Will create a new export file (see below) for download.

Required `body` (may be empty object)
```json
{ 
    "start_date": "2019-01-01",
    "end_date": "2019-01-31",
    "is_full_report": true
}
```
For normal operations, only include `end_date`
- this ensures changes from earlier exports will be included too
- leaving `start_date` empty will default to Jan 1st of the year in `end_date`

Use `start_date` at the beginning of the new year, when processing last year:
- Early Jan, you may want to include late documents until e.g. Jan 6.
- Setting `end_date` as "2020-01-06", and `start_date` at "2019-01-01", will include all relevant docs until Jan 6.
NB: A better solution is to (manually) change the invoice date on the documents you want to include to Dec 31st.

The `full_report` option exports the latest state of all docs in a time period, ignoring any previous exports or changes. When `full_report` is set, `start_date` and `end_date` are also required.

Response: `200 OK` with body:
```json
{ 
    "filename": "btw-export 2019-02-28 14u09m00s new.xlsx", 
    "url": "...",
    "create_date": "2019-03-06",
    "start_date": "2019-01-01",
    "end_date": "2019-02-28"
}
```

### `/btw-export/[admin-id]/export/[filename]` DELETE
Deletes an export file. **Also updates stats**.
Only possible to delete latest export file (one at a time).

Response: 
- `200 OK` if all went well.
- `400 Bad request` if filename does not match latest export.

### `/btw-export/[admin-id]/webhook` POST
Webhook endpoint for moneybird for updated or deleted documents.

Response: 
- `200 OK`

### `/btw-export/[admin-id]/sync` POST
Runs a sync with Moneybird. Can be invoked in first setup and after interruption of the webhook.
Normally runs a sync with all Moneybird docs for the current year. Optionally takes a query parameter `?year=2020` to sync docs from a previous start year. In all cases, the sync will run until the current year.

Response: 
- `200 OK` if all went well. Always has `body` in response.
    - body may be empty object (full sync was completed), 
    - or body contains `maxExceeded: true`: in which case sync incomplete, and needs to be run again (may be required multiple times)

---

## Under the hood

State data and export history situation is stored in the following structure:
```json
[
    {
        "id": "123456789",
        "latest_state": {
            "type": "receipt",
            "version": 2234,
            "date": "2020-02-01",
            "isDeleted": false,
            "details": [
                {
                    "id": "1345",
                    "total_price_excl_tax_with_discount_base": "1210.00",
                    "tax_rate_id": "1234567",
                    "ledger_account_id": "12324567"
                }
            ]
        },
        "exports": [
            {
                "file": { 
                    "filename": "btw-export 2019-02-28T140900 new.xlsx", 
                    "url": "...",
                    "create_date": "2019-03-06",
                    "start_date": "2019-01-01",
                    "end_date": "2019-02-28"
                },
                "type": "receipt",
                "version": 2234,
                "date": "2020-02-01",
                "isDeleted": false,
                "details": [
                    {
                        "id": "1345",
                        "total_price_excl_tax_with_discount_base": "1210.00",
                        "tax_rate_id": "1234567",
                        "ledger_account_id": "12324567"
                    }
                ]
            }
        ]
    }
]
```

File is created on first sync, and updated on subsequent syncs.

### Example
When an export is made for Feb (start + end date in Feb filled out), the following documents are included in export:
- new docs: with an invoice date in Feb, not previously exported
- changed docs: with invoice date in Feb, where the last exported state was different (checking price + tax_rate_id in details)
- deleted docs: with invoice date in Feb, and isDeleted is true, where the last exported state was not isDeleted

In this example, the following documents will ***not*** be included in the export:
- new docs with an invoice date after Feb or before Feb
- changed docs with an invoice date before or after Feb
- deleted docs with an invoice date before or after Feb

But this is OK: they will continue to be available for a future export.

### Function structure

`sync.getChangeSet`:
- gets MB receipt and purchase invoice latest versions (all) (`sync.mbSync`)
- gets DB docs latestState (maybe all) 
    - compare versions of DB records (exclude isDeleted)
        - add db record not in MB to 'deleted'
        - add db record newer in MB to 'changed'
    - if not last from DB: run again with more DB docs
- after last DB docs are processed
- select all MB docs not in DB
- add to 'new'
- return the changeSet (ready for MB fetch and update)
