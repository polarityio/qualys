polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  tabKeys: Ember.computed.alias('details.tabKeys'),
  showLoadMoreKnowledgeBaseRecords: Ember.computed.alias(
    'details.showLoadMoreKnowledgeBaseRecords'
  ),
  knowledgeBaseRecordCount: Ember.computed.alias('details.knowledgeBaseRecordCount'),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  expandableTitleStates: {},
  copiedStates: {},
  isRunningStates: {},
  messageStates: {},
  errorMessageStates: {},
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
    },
    customOnMessage: function (displayField, displayFieldIndex) {
      const outerThis = this;
      outerThis.set(
        `messageStates`,
        Object.assign({}, outerThis.get('messageStates'), {
          [`${displayField.label}${displayFieldIndex}`]: ''
        })
      );
      outerThis.set(
        `errorMessageStates`,
        Object.assign({}, outerThis.get('errorMessageStates'), {
          [`${displayField.label}${displayFieldIndex}`]: ''
        })
      );
      outerThis.set(
        `isRunningStates`,
        Object.assign({}, outerThis.get('isRunningStates'), {
          [`${displayField.label}${displayFieldIndex}`]: true
        })
      );

      outerThis
        .sendIntegrationMessage({
          action: displayField.onMessageActionName,
          data: displayField.onMessageData
        })
        .then((result) => {
          Object.keys(result).forEach((resultKey) =>
            resultKey === 'message'
              ? outerThis.set(
                  `messageStates`,
                  Object.assign({}, outerThis.get('messageStates'), {
                    [`${displayField.label}${displayFieldIndex}`]: result[resultKey]
                  })
                )
              : outerThis.set(resultKey, result[resultKey])
          );
        })
        .catch((err) => {
          outerThis.set(
            `errorMessageStates`,
            Object.assign({}, outerThis.get('errorMessageStates'), {
              [`${displayField.label}${displayFieldIndex}`]: `Failed: ${
                err.message || err.title || err.description || 'Unknown Reason'
              }`
            })
          );
        })
        .finally(() => {
          outerThis.set(
            `isRunningStates`,
            Object.assign({}, outerThis.get('isRunningStates'), {
              [`${displayField.label}${displayFieldIndex}`]: false
            })
          );
          outerThis.get('block').notifyPropertyChange('data');
          setTimeout(() => {
            outerThis.set(
              `messageStates`,
              Object.assign({}, outerThis.get('messageStates'), {
                [`${displayField.label}${displayFieldIndex}`]: ''
              })
            );
            outerThis.set(
              `errorMessageStates`,
              Object.assign({}, outerThis.get('errorMessageStates'), {
                [`${displayField.label}${displayFieldIndex}`]: ''
              })
            );
            outerThis.get('block').notifyPropertyChange('data');
          }, 5000);
        });
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
            outerThis.set('knowledgeBaseRecordCount', knowledgeBaseRecordCount);
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
