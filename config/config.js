module.exports = {
  name: '__TODO__',
  acronym: '__TODO__',
  description: '__TODO__',
  entityTypes: [
    //__TODO__
    'IPv4',
    'IPv6',
    'MD5',
    'SHA1',
    'SHA256',
    'MAC',
    'string',
    'email',
    'domain',
    'url',
    'hash'
  ],
  customTypes: [
    {
      key: 'key',
      regex: /value/
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
    rejectUnauthorized: false
  },
  logging: {
    level: 'trace' //trace, debug, info, warn, error, fatal
  },
  options: []
};
