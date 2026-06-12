export const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

export const QUERY_PATHS_BY_TYPE: Record<string, Record<string, string[]>> = {
  qid: {
    assets: ['name'],
    vulnerabilities: ['vulnerabilities.vulnerability.qid', 'vulnerabilities.vulnerability.title']
  },
  cve: {
    assets: ['name'],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  },
  domain: {
    assets: ['name', 'interfaces.hostname'],
    vulnerabilities: ['vulnerabilities.hostAssetName', 'vulnerabilities.vulnerability.title']
  },
  IPv4: {
    assets: ['interfaces.address', 'name', 'interfaces.dnsAddress', 'interfaces.gatewayAddress'],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  },
  IPv6: {
    assets: ['interfaces.address', 'name', 'interfaces.dnsAddress', 'interfaces.gatewayAddress'],
    vulnerabilities: ['vulnerabilities.vulnerability.title']
  }
};
QUERY_PATHS_BY_TYPE.customType = QUERY_PATHS_BY_TYPE.qid;

export const SEARCH_COLUMN_NAMES_BY_TYPE: Record<string, string[]> = {
  cve: ['title', 'category', 'diagnosis', 'solution', 'cves', 'vender_references'],
  qid: ['qid'],
  default: ['title', 'diagnosis', 'solution', 'vender_references']
};

export interface DisplayFormatEntry {
  label?: string;
  isTitle?: boolean;
  isDate?: boolean;
  isList?: boolean;
  isListOfLinks?: boolean;
  isHtml?: boolean;
  isNewSectionLineBreak?: boolean;
  indent?: number;
  collapsibleListItems?: boolean;
  showLabelAndValue?: boolean;
  fieldIsCopyable?: boolean;
  shouldCopyFieldLabel?: boolean;
  itemDisplayFormat?: DisplayFormat;
}

export type DisplayFormatValue = string | DisplayFormatEntry;
export type DisplayFormat = Record<string, DisplayFormatValue>;

export const HOST_DETECTION_DISPLAY_FORMAT: DisplayFormat = {
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
      results: 'Detection Result',
      qid: { label: 'QID', fieldIsCopyable: true, shouldCopyFieldLabel: true },
      type: 'Detection Type',
      severity: 'Severity',
      port: 'Port',
      protocol: 'Protocol',
      ssl: 'SSL',
      status: 'Status',
      is_ignored: 'Is Ignored',
      is_disabled: 'Is Disabled',
      times_found: 'Times Found',
      first_found_datetime: { label: 'First Found', isDate: true },
      last_found_datetime: { label: 'Last Found', isDate: true },
      last_test_datetime: { label: 'Last Tested', isDate: true },
      last_update_datetime: { label: 'Last Updated', isDate: true },
      last_processed_datetime: { label: 'Last Processed', isDate: true }
    }
  },
  newSectionLineBreak: { isNewSectionLineBreak: true }
};

export const KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT: DisplayFormat = {
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