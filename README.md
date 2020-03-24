# BTW-export

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
```json
{
    "synced": 100,
    "not_synced": 233,
    "max_exceeded": true
}
```

### `/btw-export/[admin-id]/verify` POST
Does a check on the integrity of the database.
Requires a (maybe empty) `body` object:

```json
{ 
    "ExclusiveStartKey": "[some key]",
}
```
Response: 
- `200 OK` if all went well. Always has `body` in response.
```json
{
    "verified": 100,
    "issues": [

    ],
    "LastEvaluatedKey": "[some key]";
}
```
If the response body contains a `LastEvaluatedKey`, this means that the verification is not yet finished, and needs to be run again, by providing the key as the `ExclusiveStartKey` in the next request.


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