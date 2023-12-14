module.exports = {
  name: 'Qualys',
  acronym: 'QLS',
  description:
    "The Polarity Qualys Integration queries the Qualys Cloud Platform's Host Detection List and KnowledgeBase for IP Addresses, Domains, CVEs and QIDs.",
  entityTypes: ['IPv4', 'IPv6', 'domain', 'cve'],
  customTypes: [
    {
      key: 'qid',
      regex: /(?:QID|qid):\s*\d{1,8}/
    }
  ],
  defaultColor: 'light-purple',
  styles: ['./styles/styles.less'],
  onDemandOnly: true,
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  request: {
    cert: '',
    key: '',
    passphrase: '',
    ca: '',
    proxy: ""
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },

  options: [
    {
      key: 'url',
      name: 'Qualys URL',
      description:
        'The URL of the Qualys you would like to connect to (including http:// or https://)',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'username',
      name: 'Qualys Username',
      description: 'The Username for your Qualys Account',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'password',
      name: 'Qualys Password',
      description: 'The Password associated with the Qualys Account',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'shouldDeepSearchForAssets',
      name: 'Do Deep Search For Assets (Host List Detections)',
      description:
        'Currently, Qualys only allows for searching Assets (Host List Detections) by IP ' +
        'Address and QID.  If checked, this option will make it so other entity types that ' +
        'obtain results from the KnowledgeBase, search those results QIDs automatically ' +
        'in the Asset Lists.  (NOTE: this will increase query times)',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
