# BTW-export

This is work in progress. Not yet ready for public consumption.
TODO:
- [x] Setup DynamoDB Table in serverless.yml for state data and export history
- [x] function to update DynamoDB Table with latest Moneybird
- [ ] function to fetch latest info from Moneybird, using id-list structure
- [ ] function to sync ids and versions (calling mb-incoming-sync)

API to sync and connect with Moneybird.
Specifically to process purchase invoices and receipts for the purpose of VAT reporting.

## Background
By default, Moneybird does not provide any reporting that takes exports or snapshots into account.
In Moneybird, purchase invoices and receipts may be changed at any time. Which is great, but not so good for reporting. Changes to a document after it has been exported may get lost in reporting.

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

Will also run sync to get latest Moneybird status.

Response body structure:
```json
{
    "open_stats": {
        "new_docs_after_export_count": 12,
        "new_docs_before_export_count": 4,
        "changed_docs": 8,
        "deleted_docs": 2
    },
    "files": [
        {
            "filename": "btw-export 2019-01-31T130823 full.xlsx", 
            "url": "...",
            "create_date": "2019-02-08",
            "start_date": "2019-01-01",
            "end_date": "2019-01-31"
        },
        { 
            "filename": "btw-export 2019-02-28T140900 new.xlsx", 
            "url": "...",
            "create_date": "20190306",
            "start_date": "20190101",
            "end_date": "20190228"
        }
    ]
}
```

### `/btw-export/[admin-id]/file` POST
Will create a new export file (see below) for download.

Will first run sync to get latest Moneybird status.

Required `body` (may be empty object)
```json
{ 
    "start_date": "2019-01-01",
    "end_date": "2019-01-31",
    "full_report": true
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
    "filename": "btw-export 2019-02-28T140900 new.xlsx", 
    "url": "...",
    "create_date": "2019-03-06",
    "start_date": "2019-01-01",
    "end_date": "2019-02-28"
}
```

### `/btw-export/[admin-id]/file/[filename]` DELETE
Deletes an export file. **Also updates stats**.
It is only possible to delete the latest export file, rolling back snapshots one at a time.

Response: 
- `200 OK` if all went well.
- `400 Bad request` if request tried to delete a file other than the latest export.

---

## Under the hood

State data and export history situation is stored in the following structure:
```json
[
    {
        "id": "123456789",
        "latest_state": {
            "type": "receipt",
            "date": "2020-02-01",
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
                "date": "2020-02-01",
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
- deleted docs: with invoice date in Feb, and isDeleted is true, where the last exported state was different

In this example, the following documents will ***not*** be included in the export:
- new docs with an invoice date after Feb or before Feb
- changed docs with an invoice date before or after Feb
- deleted docs with an invoice date before or after Feb

But this is OK: they will continue to be available for a future export.
