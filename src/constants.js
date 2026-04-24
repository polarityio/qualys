const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const QUERY_PATHS_BY_TYPE = {
  qid: {
    assets: ['name'],
    vulnerabilities: [
      'vulnerabilities.vulnerability.qid',
      'vulnerabilities.vulnerability.title'
    ]
  },
  cve: {
    assets: ['name'],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  },
  domain: {
    assets: ['name', 'interfaces.hostname'],
    vulnerabilities: [
      'vulnerabilities.hostAssetName',
      'vulnerabilities.vulnerability.title'
    ]
  },
  IPv4: {
    assets: [
      'interfaces.address',
      'name',
      'interfaces.dnsAddress',
      'interfaces.gatewayAddress'
    ],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  },
  IPv6: {
    assets: [
      'interfaces.address',
      'name',
      'interfaces.dnsAddress',
      'interfaces.gatewayAddress'
    ],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  }
};

const SEARCH_COLUMN_NAMES_BY_TYPE = {
  cve: ['title', 'category', 'diagnosis', 'solution', 'cves', 'vender_references'],
  qid: ['qid'],
  default: ['title', 'diagnosis', 'solution', 'vender_references']
};

const HOST_DETECTION_DISPLAY_FORMAT = {
  ip: { label: 'IP Address', isTitle: true, showLabelAndValue: true },
  id: 'Host Detection ID',
  asset_id: 'Asset Id',
  category: 'Category',
  os: 'Operating System',
  dns: 'DNS',
  last_scan_datetime: { label: 'Last Scanned', isDate: true },
  last_vm_scanned_date: { label: 'Last VM Scanned', isDate: true },
  last_vm_scanned_duration: 'Last VM Scanned Duration',
  detection_list: {
    label: 'Detections List',
    isList: true,
    indent: 1,
    collapsibleListItems: true,
    itemDisplayFormat: {
      qid: { label: 'QID', fieldIsCopyable: true, shouldCopyFieldLabel: true },
      type: 'Detection Type',
      severity: 'Severity',
      qds: 'QDS Score',
      qds_severity: 'QDS Severity',
      qds_factors: 'QDS Factors',
      status: 'Status',
      port: 'Port',
      protocol: 'Protocol',
      ssl: 'SSL',
      is_ignored: 'Is Ignored',
      is_disabled: 'Is Disabled',
      times_found: 'Times Found',
      first_found_datetime: { label: 'First Found', isDate: true },
      last_found_datetime: { label: 'Last Found', isDate: true },
      last_test_datetime: { label: 'Last Tested', isDate: true },
      last_update_datetime: { label: 'Last Updated', isDate: true },
      last_processed_datetime: { label: 'Last Processed', isDate: true },
      results: 'Detection Result'
    }
  },
  newSectionLineBreak: { isNewSectionLineBreak: true }
};

const CVE_DISPLAY_FORMAT = {
  title: { isTitle: true },
  qid: { label: 'QID', fieldIsCopyable: true, shouldCopyFieldLabel: true },
  vuln_type: 'Vuln Type',
  severity: 'Severity Level',
  category: 'Category',
  patchable: 'Patch Available',
  published: { label: 'Published On', isDate: true },
  modified: { label: 'Last Modified', isDate: true },
  cvss_base: 'CVSS Base',
  cvss_temporal: 'CVSS Temporal',
  cvss_v3_base: 'CVSS v3 Base',
  cvss_v3_temporal: 'CVSS v3 Temporal',
  threat_intelligence: 'Threat Intelligence',
  cves: { label: 'CVE IDs', isListOfLinks: true },
  diagnosis: { label: 'Diagnosis', isHtml: true },
  consequence: { label: 'Consequence', isHtml: true },
  solution: { label: 'Solution', isHtml: true },
  newSectionLineBreak: { isNewSectionLineBreak: true }
};

const KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT = {
  title: { isTitle: true },
  qid: { label: 'QID', fieldIsCopyable: true, shouldCopyFieldLabel: true },
  severity: 'Severity',
  category: 'Category',
  sub_category: 'Sub Category',
  supported_modules: 'Supported Modules',
  patchable: 'Patch Available',
  virtual_patch_available: 'Virtual Patch Available',
  published: { label: 'Published On', isDate: true },
  modified: { label: 'Service Modified On', isDate: true },
  threat_intelligence: 'Threat Intelligence',
  cves: { label: 'CVE IDs', isListOfLinks: true },
  bugtraq: { label: 'Bugtraq IDs', isListOfLinks: true },
  vender_references: { label: 'Vendor References', isListOfLinks: true },
  diagnosis: { label: 'Diagnosis', isHtml: true },
  solution: { label: 'Solution', isHtml: true },
  newSectionLineBreak: { isNewSectionLineBreak: true }
};

const SCAN_DISPLAY_FORMAT = {
  title: { isTitle: true },
  state: 'Status',
  sub_state: 'Sub-Status',
  launch_datetime: { label: 'Launched', isDate: true },
  duration: 'Duration',
  type: 'Scan Type',
  user_login: 'Launched By',
  target: 'Target',
  option_profile: 'Option Profile',
  ref: { label: 'Reference', fieldIsCopyable: true, shouldCopyFieldLabel: false },
  newSectionLineBreak: { isNewSectionLineBreak: true }
};

module.exports = {
  IGNORED_IPS,
  QUERY_PATHS_BY_TYPE,
  SEARCH_COLUMN_NAMES_BY_TYPE,
  KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT,
  HOST_DETECTION_DISPLAY_FORMAT,
  CVE_DISPLAY_FORMAT,
  SCAN_DISPLAY_FORMAT
};
