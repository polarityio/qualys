# Polarity Qualys Integration
 The Polarity Qualys Integration queries the Qualys Cloud Platform's Host Detection List for IP Addresses and QIDs. The Host Detections list will only get queried when searching for IP Addresses and QIDs, the host detection API does not enable other searching at this time. T

> *NOTE:* QIDs can be searched onDemand by prefixing the QID with `QID: <your_qid>`

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

<div style="display:flex; align-items: flex-start;">
  <img width="370" style="margin-right: 7px" title="Host List Detections" alt="Host List Detections" src="./assets/Host List Detections.png">
</div>

## About Qualys 
The Qualys Cloud Platform helps businesses simplify security operations and lower the cost of compliance by delivering critical security intelligence on demand and automating the full spectrum of auditing, compliance and protection for IT systems and web applications. 
To learn more about Qualys, visit the [official website](https://www.qualys.com/).

## Integration Limitations
### Host Detection List Lookup Limits
Qualys' Host Detection List API only allows lookups on IP Addresses and QIDs, so only IP Addresses and QIDs will show Host Detection List results.

## Qualys Integration User Options
### Qualys URL
The URL of the Qualys you would like to connect to (including http:// or https://)

### Qualys Username
The Username for your Qualys Account

### Qualys Password
The Password associated with the Qualys Account

## Installation Instructions
Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).

## Polarity
Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see:
https://polarity.io/