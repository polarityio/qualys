polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  tabKeys: Ember.computed.alias('details.tabKeys'),
  showLoadMoreKnowledgeBaseRecords: Ember.computed.alias(
    'details.showLoadMoreKnowledgeBaseRecords'
  ),
  knowledgeBaseRecordCount: Ember.computed.alias(
    'details.knowledgeBaseRecordCount'
  ),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  expandableTitleStates: {},
  activeTab: '',
  knowledgeBasePage: 0,
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
    loadMoreKnowledgeBaseRecords: function () {
      const outerThis = this;
      outerThis.set('loadingMoreKnowledgeBaseRecords', true);
      outerThis.get('block').notifyPropertyChange('data');

      outerThis
        .sendIntegrationMessage({
          action: 'loadMoreKnowledgeBaseRecords',
          data: {
            entity: outerThis.get('block.entity'),
            knowledgeBasePage: outerThis.get('knowledgeBasePage') + 1
          }
        })
        .then(
          ({
            knowledgeBaseRecords,
            showLoadMoreKnowledgeBaseRecords,
            knowledgeBaseRecordCount
          }) => {
            outerThis.set(
              'knowledgeBaseRecordCount',
              knowledgeBaseRecordCount
            );
            outerThis.set(
              'showLoadMoreKnowledgeBaseRecords',
              showLoadMoreKnowledgeBaseRecords
            );
            outerThis.set('knowledgeBasePage', outerThis.get('knowledgeBasePage') + 1);
            outerThis.set(
              'details.knowledgeBaseRecords',
              outerThis.get('details.knowledgeBaseRecords').concat(knowledgeBaseRecords)
            );
          }
        )
        .finally(() => {
          outerThis.set('loadingMoreKnowledgeBaseRecords', false);
          outerThis.get('block').notifyPropertyChange('data');
        });
    }
  }
});
