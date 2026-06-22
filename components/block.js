polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  summary: Ember.computed.alias('block.data.summary'),
  tabKeys: Ember.computed.alias('details.tabKeys'),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  expandableTitleStates: {},
  copiedStates: {},
  isRunningStates: {},
  messageStates: {},
  errorMessageStates: {},
  hostDetectionsFound: false,
  activeTab: '',
  isScanLaunching: false,
  scanLaunchError: '',
  scanRef: '',
  isCheckingStatus: false,
  scanState: '',
  scanSubState: '',
  scanDuration: '',

  isIpEntityAndScanEnabled: Ember.computed('details._scanMeta', function () {
    const meta = this.get('details._scanMeta');
    return !!(meta && meta.isIpEntity && meta.enableScanLaunch);
  }),

  hasScanRef: Ember.computed('scanRef', function () {
    return !!this.get('scanRef');
  }),

  scanStateClass: Ember.computed('scanState', function () {
    const s = (this.get('scanState') || '').toLowerCase();
    if (s === 'finished') return 'qls-state-done';
    if (s === 'running') return 'qls-state-running';
    if (s === 'queued' || s === 'loading') return 'qls-state-queued';
    if (s === 'cancelled' || s === 'error') return 'qls-state-error';
    return 'qls-state-unknown';
  }),

  init() {
    const details = this.get('details');
    this.set(
      'activeTab',
      this.get('tabKeys').find((tabKey) => details[tabKey] && details[tabKey].length)
    );

    this._super(...arguments);
  },
  actions: {
    changeTab: function (tabName) {
      this.set('activeTab', tabName);
      // Clear scan messages when switching tabs
      if (tabName !== 'scans') {
        this.set('scanLaunchError', '');
      }
    },
    launchScan: function () {
      if (this.get('isScanLaunching')) return;

      const entityValue = this.get('block.entity.value');
      this.set('isScanLaunching', true);
      this.set('scanLaunchError', '');
      this.set('scanRef', '');
      this.set('scanState', '');
      this.set('scanSubState', '');
      this.set('scanDuration', '');

      this.sendIntegrationMessage({ action: 'LAUNCH_SCAN', entityValue })
        .then((result) => {
          // Sanitize scanRef: extract just the scan/XXXXX.XXXXX portion to handle
          // xml2js charkey collision that can prefix the value with garbage characters.
          const rawScanRef = result.scanRef || '';
          const scanRefMatch = rawScanRef.match(/scan\/\d+\.\d+/);
          const scanRef = scanRefMatch ? scanRefMatch[0] : rawScanRef.trim();
          this.set('scanRef', scanRef);
        })
        .catch((err) => {
          this.set(
            'scanLaunchError',
            err.detail || 'Scan launch failed. Check Polarity logs.'
          );
        })
        .finally(() => {
          this.set('isScanLaunching', false);
          this.get('block').notifyPropertyChange('data');
        });
    },

    checkScanStatus: function () {
      if (this.get('isCheckingStatus')) return;

      const scanRef = this.get('scanRef');
      if (!scanRef) return;

      this.set('isCheckingStatus', true);
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({ action: 'CHECK_SCAN_STATUS', scanRef })
        .then((result) => {
          this.set('scanState', (result && result.state) || 'Unknown');
          this.set('scanSubState', (result && result.subState) || '');
          this.set('scanDuration', (result && result.duration) || '');
        })
        .catch((err) => {
          this.set(
            'scanLaunchError',
            err.detail || 'Status check failed. Check Polarity logs.'
          );
          this.set('scanState', '');
        })
        .finally(() => {
          this.get('block').notifyPropertyChange('data');
          this.set('isCheckingStatus', false);
        });
    },
    toggleExpandableTitle: function (
      displayFieldIndex,
      itemDisplayFieldsIndex,
      fieldName
    ) {
      const modifiedExpandableTitleStates = Object.assign(
        {},
        this.get('expandableTitleStates'),
        {
          [`${displayFieldIndex}${itemDisplayFieldsIndex}${fieldName}`]: !this.get(
            'expandableTitleStates'
          )[`${displayFieldIndex}${itemDisplayFieldsIndex}${fieldName}`]
        }
      );

      this.set(`expandableTitleStates`, modifiedExpandableTitleStates);
    },
    copyField: function (
      displayFieldValue,
      displayFieldIndex,
      displayFieldLabel,
      subIndex,
      shouldCopyFieldLabel
    ) {
      navigator.clipboard.writeText(
        `${shouldCopyFieldLabel ? `${displayFieldLabel}: ` : ''}${displayFieldValue}`
      );

      this.set(
        `copiedStates`,
        Object.assign({}, this.get('copiedStates'), {
          [`${displayFieldIndex}${displayFieldLabel}${subIndex}`]: true
        })
      );
      this.get('block').notifyPropertyChange('data');
      setTimeout(() => {
        this.set(
          `copiedStates`,
          Object.assign({}, this.get('copiedStates'), {
            [`${displayFieldIndex}${displayFieldLabel}${subIndex}`]: false
          })
        );
        this.get('block').notifyPropertyChange('data');
      }, 3000);
    }
  }
});
