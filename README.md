# BTW-export

API to sync and connect with Moneybird.
Specifically to process purchase invoices and receipts for the purpose of VAT reporting.

## Background
By default, Moneybird does not provide any reporting that takes exports or snapshots into account.
Purchase invoices and receipts can be changed at any time. Which is great, but not so good for reporting. 

#### An example of the issue
- In January, a receipt is added, with 21% VAT.
- End of January, a report is generated (for submission to tax authority) that contains all receipts, summarized per VAT rule.
- In February, the receipt is added, and the VAT rule is changed to 0%.
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
{ "Authentication" : "Bearer xxxxxxx" }
```

### `/[admin-id]/btw-export` GET
To retrieve history and summary of VAT exports.

Response body structure:
```json
{
    "last_sync_date": "20200422", // date of last sync with Moneybird
    "open_stats": {
        "new_docs_count": 12, // number of new docs after latest export date
        "late_docs_count": 4, // number of new docs dated before latest export date
        "changed_docs": 8 // number of docs already exported but changed since latest export
    },
    "files": [
        {
            "filename": "btw-export 20190131 full.xlsx", 
            "url": "...", // download link
            "create_date": "20190208",
            "start_date": "20190101",
            "end_date": "20190131"
        },
        { 
            "filename": "btw-export 20190228 new.xlsx", 
            "url": "...", // download link
            "create_date": "20190306",
            "start_date": "20190101",
            "end_date": "20190228"
        }
    ]
}
```

### `/[admin-id]/btw-export/file` POST
Will create a new export file (see below) for download.

Required `body` (may be empty object)
```json
{ 
    "start_date": "20190101", // optional, in YYYYMMDD format
    "end_date": "20190131", // optional, in YYYYMMDD format
    "full_report": true // optional, to provide full report
}
```

Response: `200 OK`

### `/[admin-id]/btw-export/file/[filename]` DELETE
Deletes an export file.
**Also updates stats**.

Response: `200 OK`

### `/[admin-id]/btw-export/sync` POST
Syncs stats with latest Moneybird situation.

Response: `200 OK`

---

## Under the hood

Sync call will create a file with the following structure:
```json
[
    {
        "id": "123456789", // doc id
        "type": "receipt" // doc type
    }
]
```