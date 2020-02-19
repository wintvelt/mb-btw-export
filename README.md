# BTW-export

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
    "last_sync_date": "2020-04-22",
    "open_stats": {
        "new_docs_count": 12,
        "late_docs_count": 4,
        "changed_docs": 8
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

Will also run sync to get latest Moneybird status.

Required `body` (may be empty object)
```json
{ 
    "start_date": "2019-01-01",
    "end_date": "2019-01-31",
    "full_report": true
}
```

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
Deletes an export file.
**Also updates stats**.

Response: `200 OK`

### `/btw-export/[admin-id]/sync` POST
Syncs stats with latest Moneybird situation.

Response: `200 OK`

---

## Under the hood

Latest situation is in a file `btw-export-latest.json` with the following structure:
```json
[
    {
        "id": "123456789",
        "type": "receipt",
        "latest_state": {
            "version": 12345,
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
                "filename": "btw-export 2019-02-28T140900 new.xlsx",
                "version": 12345,
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