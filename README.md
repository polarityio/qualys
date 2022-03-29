# Polarity Qualys Integration
![image](https://img.shields.io/badge/status-beta-green.svg)

The Qualys Cloud Platform helps businesses simplify security operations and lower the cost of compliance by delivering critical security intelligence on demand and automating the full spectrum of auditing, compliance and protection for IT systems and web applications.  The Polarity Qualys Integration queries the Qualys Cloud Platform's Host Detection List and KnowledgeBase for IP Addresses, Domains, CVEs and optionally QIDs.

<div style="display:flex; align-items: flex-start;">
  <img width="370" alt="Integration Example" src="./assets/hostDetections.png">
  <img width="370" alt="Integration Example" src="./assets/knowledgeBase.png">
</div>



To learn more about Qualys, visit the [official website](https://www.qualys.com/).


## Qualys Integration Config Options
> ***NOTE:*** In order for this integration to function, you must set the `url`, `username`, `password`, and `dataRefreshTime` properties in the `./config/config.js` file
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


## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).


## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see:

https://polarity.io/
