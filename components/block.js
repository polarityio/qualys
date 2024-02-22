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
