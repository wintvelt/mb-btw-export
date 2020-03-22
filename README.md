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

- [x] create `/btw-export/[admin-id] GET`
    - [x] implement stats function for 1 exportTable record (unexported)
    - [x] implement query for all exportTable records
    - [x] implement latestExportDate in stats
    - [ ] implement listing function in handler
        - [x] move response function to helpers folder in all handlers
        - [x] get unexported stats
        - [x] get export stats
        - [x] filter export stats for start-year

- [ ] add integrity
    - [ ] for updating latestState: latestState + unexported
    - [ ] for creating exports: adding exported record + updating latestState + deleting unexported
        (not possible for exportStats, but these can be recreated)
    - [ ] for deleting an export: deleting export + updating latestState + updating unexported

- [ ] check performance of new setup
- [ ] improve max volume for exports
    - [ ] cut exportTable update into chunks of 50 (watch for race conditions)
    - [ ] bundle id states in lists per weekday
    - [ ] exported states per id as JSON.strings

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

The excel file contains the following columns:
- `tax-rate`: text description of applied tax-rate code
- `account`: text description of ledger acccount where the invoice was booked
- `docId`: the moneybird id of the invoice document (NB each line on the invoice is a separate line in the excel file, so same docId may appear on multiple rows)
- `moneybird`: link to the document in moneybird
- `type`: receipt or purchase invoice
- `date`: the booking date of the invoice
- `change`: the kind of change that this line applies to:
    - added: the line is new/ document or detail is added to moneybird
    - changed: the detail was exported before, the line reflects the change since the last export
    - deleted: the detail was deleted since the last export
- `bedrag`: the amount, ***excluding*** tax

---

## API
All endpoints require `headers` with a valid Moneybird Auth Bearer token
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
        "latest_export_name": "btw-export 2019-01-31 13u08m23s.xlsx",
        "latest_export_create_date": "2019-01-31",
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
            "filename": "btw-export 2019-01-31 13u08m23s.xlsx", 
            "url": "...",
            "create_date": "2019-02-08",
            "start_date": "2019-01-01",
            "end_date": "2019-01-31",
            "doc_count": 75
        },
        { 
            "filename": "btw-export 2019-02-28 14u09m00s.xlsx", 
            "url": "...",
            "create_date": "20190306",
            "start_date": "20190101",
            "end_date": "20190228",
            "doc_count": 22
        }
    ],
    "hasOlder": false
}
```
The variables `new_docs_after_export_count` and `new_docs_before_export_count` relate to the creation date of the latest export.
The `hasOlder` boolean can be used to retrieve stats from earlier exports.

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

Response: `200 OK` with body including the stats of the created export:
```json
{ 
    "filename": "btw-export 2019-02-28 14u09m00s.xlsx", 
    "url": "...",
    "create_date": "2019-03-06",
    "start_date": "2019-01-01",
    "end_date": "2019-02-28",
    "doc_count": 17
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
Normally runs a sync with all Moneybird docs for the current year. Optionally takes a query parameter for year (e.g. `?year=2019`) to sync docs from a previous start year. The year parameter only sets the start year. In all cases, the sync will run until the current year.

Response: 
- `200 OK` if all went well. Always has `body` in response.
    - body may be empty object (full sync was completed), 
    - or body contains `maxExceeded: true`: in which case sync incomplete, and needs to be run again (may be required multiple times)

---

## Under the hood

- handlerList
    - stats
        - deleteExport
            getLatestExport
            queryIndexOnce
        - query
            queryOnce
    - request
- handlerExport
    - exportState
        getUnexported
        - query
            queryOnce
        - diff
            diff
        setExport
        - update
            singleWithItems
        saveStats
    - latestState
        addExport
        - update
            single
    - unexported
        removeUnexported
    - dateHelpers
        doubleStr
    - s3
        save
    - excel
        makeXlsRows
        makeXls
    - request
- handlerSync
    - sync
        getDocUpdates
        - query
            queryVersions
    - update
        single
    - unexported
        updateUnexported
- handlerDelete
    - deleteExport
        getLatestExport
        getExportedDocs
        - query
            queryOnce
        deleteExportedDoc
    - update
        single
    - unexported
        updateUnexported
    - s3
        delete
- webhook
    - update
        single
    - unexported
        updateUnexported

- [ ] idea to refactor
    - [x] add a dateTime stamp to 
        - [x] latestState, 
        - [x] unexported, 
        - [x] exported (not in stats)
    - [x] create new function that does TransactWrite collection of multiple updates
        - [x] change in handlerSync
        - [x] change in handlerDelete
        - [x] change in webhook
        - [x] change in handlerExport
    - transactWrites:
        [ ] webhook and sync: 
            read latestState for latestExportName + get that exported State (to use for unexported)
            check = timeStamp in latestState
            save state in latestState
            save diff in unexported + exportLogs (for export) + state (to save more info if deleted)
        [ ] delete:
            read latestState for state + latestExportName (for previous export, if exists)
            check = timeStamp in latestState
            delete exported record
            save exportLogs in latestState (without deleted export)
            save diff in unexported + exportLogs + state (to save more info if deleted)
        [ ] export:
            read unexported for diff + exportLogs
            check = timeStamp in unexported
            save exported doc
            save exportLogs in latestState (with new export)
            delete unexported

    - [ ] make the dynamoDb.update only return params
        - in unexported this can be update/ delete/ none
        - in update in 2 functions
    - [ ] make dynamoDb.delete only return params
        - in deleteExport for deleting exported doc
        - in unexported see above
        - in update (for webhook test cleanup only)

- [ ] add integrity
    - [ ] for updating latestState: latestState + unexported
        - webhook = single
        - sync = multiple
        in id: only state update
        in unexported: state + diff + exportLogs
    - [ ] for creating exports: adding exported record + updating latestState + deleting unexported
        (not possible for exportStats, but these can be recreated)
    - [ ] for deleting an export: deleting export + updating latestState + updating unexported