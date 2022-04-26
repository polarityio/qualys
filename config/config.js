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
    proxy: '',
    rejectUnauthorized: true
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
      key: 'dataRefreshTime',
      name: 'KnowledgeBase Refresh Time',
      description:
        'How often/when to refresh the local data source with the up to date data from' +
        'the Qualys KnowledgeBase API.  This is in Cron Format and is defaulted' +
        'to every day at midnight UTC. If you would like to never update' +
        'your database after the initial install, set this string to `never-update`.' +
        'Helpful Resources: https://crontab.guru/ .',
      default: '0 0 * * *',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'disableKnowledgeBase',
      name: 'Disable KnowledgeBase',
      description:
        'In case of technical issues with the KnowledgeBase Download/Refresh process or time' +
        'it takes to run the process, or any issues with the KnowledgeBase Lookup times, please' +
        'reach out to support@polarity.io.  If you wish to continue to use the integration and' +
        'only use the Host Detections List Query with IP Addresses and QIDs, set this option to true.\n' +
        'If true, we will no longer query any existing KnowledgeBase resources, and will not' +
        'pull down or update any of the KnowledgeBase content locally to be searched.',
      default: true,
      type: 'boolean',
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
        'in the Asset Lists.  (NOTE: this will increase query times and load more times ' +
        'for KnowledgeBase pagination)',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
