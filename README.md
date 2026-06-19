# Polarity Qualys Integration

The Polarity Qualys Integration queries the Qualys Cloud Platform for IP addresses, domains, CVEs, and QIDs. Host detection results are returned for IP addresses and QIDs. CVE lookups query the Qualys KnowledgeBase and return matching vulnerability records along with any associated host detections.

## About Qualys

The Qualys Cloud Platform helps businesses simplify security operations and lower the cost of compliance by delivering critical security intelligence on demand and automating the full spectrum of auditing, compliance, and protection for IT systems and web applications.

To learn more about Qualys, visit the [official website](https://www.qualys.com/).

## Supported Entity Types

| Entity Type | Description |
|---|---|
| IPv4 | Returns host detection list and scan history for the IP address |
| IPv6 | Returns host detection list for the IPv6 address |
| Domain | Returns host detection list for hosts matching the domain name |
| CVE | Returns KnowledgeBase vulnerability records matching the CVE and associated host detections |
| Qualys ID (QID) | Returns KnowledgeBase records and host detections for the matched QID |
| Custom QID Value | User-configured type for matching arbitrary strings and extracting a QID value |

## QID Entity Type

The built-in **Qualys ID (QID)** data type automatically recognizes QID strings in the following formats (case-insensitive):

| Format | Example |
|---|---|
| `QID<number>` (no separator) | `QID12345` |
| `QID:<number>` | `QID:12345` |
| `QID: <number>` | `QID: 12345` |
| `QID : <number>` | `QID : 12345` |
| `QID-<number>` | `QID-12345` |
| `QID_<number>` | `QID_12345` |
| `QID <number>` | `QID 12345` |
| `qid:<number>` (lowercase) | `qid:38623` |

The numeric QID value is extracted automatically and used for the API lookup.

## Custom QID Value Data Type

The **Custom QID Value** data type is disabled by default. It is designed for environments where QID values appear embedded in custom string formats not covered by the built-in QID pattern (e.g., internal ticket references, asset tags, or CMDB identifiers).

When enabled, Polarity will match text against the regex you configure in the **Custom QID Value Regex** option. The integration then extracts a numeric QID from the matched string and looks it up in Qualys.

**To enable it:**
1. Go to **Integration Options → Qualys → Data Types**
2. Enable the **Custom QID Value** type and enter a regex pattern that matches your custom format
3. Optionally set the **Custom QID Value Regex** option to extract the QID number (see below)

## Integration Limitations

### Host Detection List Lookup Limits
Qualys' Host Detection List API filters results by the query parameter. When searching by QID, only the detection entry for that specific QID is returned per host — not the host's full detection list. Searching by IP address returns all detections for that host.

## Integration Options

All options are admin-only and cannot be edited by regular users.

### Qualys URL
*(Required)* The base URL of your Qualys subscription, including the protocol (e.g., `https://qualysapi.qualys.com`). Do not include a trailing slash.

### Qualys Username
*(Required)* The username for your Qualys account.

### Qualys Password
*(Required)* The password associated with your Qualys account.

### Enable Scan Launch
*(Default: disabled)* When enabled, a **Launch Scan** button appears in the Scans tab for IP address entities, allowing analysts to initiate a Qualys VM scan directly from Polarity. Requires the **Scan Option Profile** to be configured.

### Scan Option Profile
The Qualys option profile title or numeric ID to use when launching scans (e.g., `Initial Options` or `43165`). Required when **Enable Scan Launch** is enabled.

### Scanner Appliance Name
The name of the scanner appliance to target when launching scans (e.g., `scanner1`). Leave blank to use the account's default scanner for the target IP.

### Custom QID Value Regex
When the **Custom QID Value** data type is enabled, this regex is used to extract the numeric QID from the matched entity string.

- If the regex contains a **capture group**, the first capture group's value is used as the QID (e.g., `TICKET-(\d+)` would extract `42` from `TICKET-42`).
- If the regex has **no capture group**, the full match is used as the QID.
- If left **blank**, the integration falls back to extracting the last contiguous sequence of digits found in the matched string (e.g., `ASSET-00038623` → `38623`).

**Examples:**

| Custom type regex (Data Types) | Custom QID Value Regex (option) | Matched string | Extracted QID |
|---|---|---|---|
| `TICKET-\d+` | `TICKET-(\d+)` | `TICKET-38623` | `38623` |
| `VULN#\d{4,8}` | *(blank)* | `VULN#12345` | `12345` |
| `asset-tag-\d+` | `(\d+)$` | `asset-tag-00091` | `00091` |

## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).

## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making. For more information about the Polarity platform please see:

https://polarity.io/
