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
  scanLaunchSuccess: '',

  isIpEntityAndScanEnabled: Ember.computed('details._scanMeta', function () {
    const meta = this.get('details._scanMeta');
    return !!(meta && meta.isIpEntity && meta.enableScanLaunch);
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
        this.set('scanLaunchSuccess', '');
      }
    },
    launchScan: function () {
      if (this.get('isScanLaunching')) return;

      const entityValue = this.get('block.entity.value');
      this.set('isScanLaunching', true);
      this.set('scanLaunchError', '');
      this.set('scanLaunchSuccess', '');
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({ action: 'LAUNCH_SCAN', entityValue }, (err, result) => {
        this.set('isScanLaunching', false);
        if (err) {
          this.set('scanLaunchError', err.detail || 'Scan launch failed. Check Polarity logs.');
        } else {
          const ref = result && result.scanRef ? ` (${result.scanRef})` : '';
          this.set(
            'scanLaunchSuccess',
            `Scan launched${ref}. Results may take several minutes to appear in Qualys.`
          );
        }
        this.get('block').notifyPropertyChange('data');
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
