# Polarity Qualys Integration
 The Polarity Qualys Integration queries the Qualys Cloud Platform's Host Detection List and KnowledgeBase for IP Addresses, Domains, CVEs and QIDs. The Host Detections list will only get queried when searching for IP Addresses and QIDs, the host detection API does not enable other searching at this time. The Qualys KnowledgeBase will be queried for all Polarity entity types. Please see information below about how the KnowledgeBase queries work. 
> *NOTE:* QIDs can be searched onDemand by prefixing the QID with `QID: <your_qid>`

### > ***Important***: **When installing `NPM` dependencies, please install using the command `npm run remote-install` instead of the typical `npm install`.**

### How to Review Polarity - Qualys Integration 
***Host Detections***
* **Summary View** -> Number of Host Dections associated with QID or IP Address 
* **Detail View**
    * *Host Information*
        * Asset ID -> Asset ID from Qualys
        * Operating System -> Host OS
        * DNS -> Host DNS/Domain
        * Last Scan Information
    * *Detections List*
        * List of all detections associated with Host

***Knowledge Base Information***
* **Summary View** -> Number of Host Dections associated with CVEs, Number of KB Records
* **Detail View**
    * *Host Infromation*
        * Asset ID -> Asset ID from Qualys
        * Operating System -> Host OS
        * DNS -> Host DNS/Domain
        * Last Scan Information
    * *Knowledge Base Records*
        * Severity of the record
        * Record Category
        * Patch Avilabilty
        * Associated CVEs
        * Vendor Information

<div style="display:flex; align-items: flex-start;">
  <img width="370" style="margin-right: 7px" title="Host List Detections" alt="Host List Detections" src="./assets/Host List Detections.png">
  <img width="383" title="KnowledgeBase Record" alt="KnowledgeBase Record" src="./assets/KnowledgeBase Record.png">
</div>

## About Qualys 
The Qualys Cloud Platform helps businesses simplify security operations and lower the cost of compliance by delivering critical security intelligence on demand and automating the full spectrum of auditing, compliance and protection for IT systems and web applications. 
To learn more about Qualys, visit the [official website](https://www.qualys.com/).

## Integration Limitations
### Host Detection List Lookup Limits
Qualys' Host Detection List API only allows lookups on IP Addresses and QIDs, so only IP Addresses and QIDs will show Host Detection List results.
### KnowledgeBase Limits
Currently, Qualys' KnowledgeBase API is unsearchable, so we are downloading the entire KnowledgeBase on your Polarity Server and doing lookups locally so you can access your Qualys KnowledgeBase Data.  This download process is run on Integration Restart and when saving User Options, as well as refreshes every night at midnight.  The refresh process will take some time, and during the initial download process you will not be able to obtain results from the KnowledgeBase, but can search the Host Detections List. 
1. > ***NOTE:*** If you wish to use the KnowledgeBase in this integration, you can uncheck the `Disable KnowledgeBase` in the user options, as it is checked by default which means the knowledge base will not work initially.
2. > ***NOTE:*** The KnowledgeBase Download/Refresh process and the KnowledgeBase Lookups have only been tested on a Qualys instance with around 250MB of KnowledgeBase Data and took approximately 15 minutes to finish.  Some KnowledgeBase instances could be 100GB+ which could severely hinder the KnowledgeBase Download/Refresh process time and the KnowledgeBase Lookup times.  If this is causing you issues, please let us know at support@polarity.io.  If you wish to only query the Host Detections List with IP Addresses, make sure to check the `Disable KnowledgeBase` option in the user options.

## Qualys Integration User Options
### Qualys URL
The URL of the Qualys you would like to connect to (including http:// or https://)

### Qualys Username
The Username for your Qualys Account

### Qualys Password
The Password associated with the Qualys Account

### KnowledgeBase Refresh Time
How often/when to refresh the local data source with the up to date data from the Qualys KnowledgeBase API.  This is outline in Cron Format and is defaulted to the first of every month at midnight UTC. If you would like to never update your database after the initial install, set this string to `never-update`.  Helpful Resources: https://crontab.guru/ .
```
'* * * * * *'
 ┬ ┬ ┬ ┬ ┬ ┬
 │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
 │ │ │ │ └── month (1 - 12)
 │ │ │ └──── day of month (1 - 31)
 │ │ └────── hour (0 - 23)
 │ └──────── minute (0 - 59)
 └────────── second (0 - 59, OPTIONAL)
'42 * * * *' -> Execute when the minute is 42 (e.g. 19:42, 20:42, etc.).
'*/5 * * * *' -> Execute every 5th minute
'0 0 1 * *' -> Execute at 00:00 on day-of-month 1 (current default).
'never-update' -> Never Update after initial install of the database
```

### Disable KnowledgeBase
In case of technical issues with the KnowledgeBase Download/Refresh process or time it takes to run the process, or any issues with the KnowledgeBase Lookup times, please reach out to support@polarity.io.  If to continue to use the integration and only use the Host Detections List Query with IP Addresses and QIDs, set this option to true.

If true, we will no longer query any existing KnowledgeBase resources, and will not
pull down or update any of the KnowledgeBase content locally to be searched.

### Deep Search For Assets (Host List Detections)
Currently, Qualys only allows for searching Assets (Host List Detections) by IP
Address and QID.  If checked, this option will make it so other entity types that
obtain results from the KnowledgeBase, search those results QIDs automatically
in the Asset Lists.  (NOTE: this will increase query times and load more times
for KnowledgeBase pagination)

## Installation Instructions
Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).
## Polarity
Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see:
https://polarity.io/