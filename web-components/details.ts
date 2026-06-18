import { css, html, nothing, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { IntegrationComponentBase, IBlock, typographyCSS } from '@polarityio/pi-components';
import { faAngleUp, faAngleDown, faCopy, faPlay, faRotate } from '@polarityio/pi-icon';

interface DisplayField {
  label?: string;
  value?: any;
  isTitle?: boolean;
  isDate?: boolean;
  isList?: boolean;
  isListOfLinks?: boolean;
  isHtml?: boolean;
  isTextBlock?: boolean;
  isNewSectionLineBreak?: boolean;
  indent?: number;
  collapsibleListItems?: boolean;
  showLabelAndValue?: boolean;
  fieldIsCopyable?: boolean;
  shouldCopyFieldLabel?: boolean;
  displayLink?: string;
  icon?: string;
  capitalize?: boolean;
}

interface Details {
  tabKeys: string[];
  [key: string]: DisplayField[] | string[] | any;
}

/**
 * Converts a camelCase or PascalCase key like "hostDetections"
 * to a title-cased, spaced label like "Host Detections".
 */
function humanizeTabKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Formats an ISO 8601 date string using Intl.DateTimeFormat (Chrome 90 safe).
 */
function formatDate(value: string): string {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: tz
    }).format(date);
  } catch {
    return String(value);
  }
}

function capitalizeStr(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class DetailsComponent extends IntegrationComponentBase {
  @property({ type: Object }) block: IBlock = {
    integrationId: '',
    acronym: '',
    data: { details: {} as any, summary: [] }
  };

  @state() private _activeTab = '';
  @state() private _expandedStates: Record<string, boolean> = {};
  @state() private _copiedStates: Record<string, boolean> = {};
  @state() private _scanLaunching = false;
  @state() private _scanCheckingStatus = false;
  @state() private _scanError: string | null = null;
  @state() private _scanResult: { scanRef: string; scanTitle: string; message: string } | null =
    null;
  @state() private _scanStatus: {
    ref: string;
    state: string;
    subState: string;
  } | null = null;

  private _copyContentId = `copy-content-${Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => b.toString(16).padStart(2, '0')
  ).join('')}`;

  static styles = [
    unsafeCSS(typographyCSS),
    css`
      :host {
        display: block;
        font-family: var(--pi-font-family-base, 'NotoSans', sans-serif);
        font-size: var(--pi-size-font-base, 0.8125rem);
        color: var(--pi-color-font-primary, #fafaff);
        line-height: var(--pi-line-height-base, 1.4);
      }

      .copy-btn-container {
        position: absolute;
        right: 10px;
        top: 7px;
        z-index: 1;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xxs, 2px);
        padding-top: var(--pi-size-spacing-xs, 4px);
      }

      .list-of-links {
        margin-bottom: var(--pi-size-spacing-sm, 8px);
      }

      .field-row {
        display: flex;
        align-items: baseline;
        gap: var(--pi-size-spacing-xs, 4px);
        flex-wrap: wrap;
      }

      .text-block {
        margin-bottom: var(--pi-size-spacing-xs, 4px);
        color: var(--pi-color-font-secondary, #cdced6);
      }

      .section-break {
        border: none;
        border-top: 1px solid var(--pi-color-border-container, #606470);
        margin: var(--pi-size-spacing-sm, 8px) 0;
      }

      .expandable-title {
        display: flex;
        align-items: center;
        gap: var(--pi-size-spacing-xs, 4px);
        cursor: pointer;
        background: none;
        border: none;
        padding: var(--pi-size-spacing-xxs, 2px) 0;
        font-family: inherit;
        font-size: inherit;
        color: var(--pi-color-font-info, #33b2ff);
        font-weight: var(--pi-font-weight-semibold, 600);
        line-height: 1.2;
        margin-bottom: var(--pi-size-spacing-xs, 4px);
      }

      .expandable-title:hover {
        opacity: 0.8;
      }

      .expandable-title-text {
        border-bottom: 1px solid var(--pi-color-font-info, #33b2ff);
      }

      .list-section {
        margin-bottom: var(--pi-size-spacing-xs, 4px);
      }

      .list-items {
        padding-left: var(--pi-size-spacing-sm, 8px);
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xxs, 2px);
      }

      .list-item-fields {
        padding-left: var(--pi-size-spacing-md, 12px);
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xxs, 2px);
      }

      .copyable-field {
        display: inline-flex;
        align-items: center;
        gap: var(--pi-size-spacing-xs, 4px);
      }

      .copy-inline-btn {
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        display: inline-flex;
        align-items: center;
        color: var(--pi-color-font-secondary, #cdced6);
      }

      .copy-inline-btn:hover {
        color: var(--pi-color-font-primary, #fafaff);
      }

      .copied-label {
        font-size: var(--pi-size-font-xs, 0.75rem);
        color: var(--pi-color-font-secondary, #cdced6);
      }

      .html-content {
        padding-left: var(--pi-size-spacing-md, 12px);
        margin-bottom: var(--pi-size-spacing-xs, 4px);
        color: var(--pi-color-font-primary, #fafaff);
      }

      .link-list {
        display: inline;
      }

      .kv-key {
        color: var(--pi-color-font-secondary, #cdced6);
        font-weight: var(--pi-font-weight-semibold, 600);
        white-space: nowrap;
      }

      .link-separator {
        color: var(--pi-color-font-secondary, #cdced6);
      }

      .indent-0 {
        padding-left: 0;
      }
      .indent-1 {
        padding-left: var(--pi-size-spacing-sm, 8px);
      }
      .indent-2 {
        padding-left: var(--pi-size-spacing-lg, 16px);
      }
      .indent-3 {
        padding-left: var(--pi-size-spacing-xl, 24px);
      }

      .scan-actions {
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xs, 4px);
        padding-bottom: var(--pi-size-spacing-sm, 8px);
        border-bottom: 1px solid var(--pi-color-border-container, #606470);
        margin-bottom: var(--pi-size-spacing-sm, 8px);
      }

      .scan-list {
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xs, 4px);
      }

      .scan-item {
        border: 1px solid var(--pi-color-border-container, #606470);
        border-radius: var(--pi-size-radius-base, 4px);
        padding: var(--pi-size-spacing-sm, 8px);
        display: flex;
        flex-direction: column;
        gap: var(--pi-size-spacing-xxs, 2px);
      }

      .scan-item h2 {
        margin-top: 0;
      }

      .scan-count-message {
        font-size: var(--pi-size-font-sm, 0.875rem);
        color: var(--pi-color-font-secondary, #cdced6);
        margin-bottom: var(--pi-size-spacing-xs, 4px);
      }
    `
  ];

  connectedCallback() {
    super.connectedCallback();
    this._initActiveTab();
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('block')) {
      this._initActiveTab();
    }
  }

  private _initActiveTab() {
    const d = this.block.data?.details as Details | undefined;
    if (!d?.tabKeys) return;

    // Restore persisted tab from componentState, or pick first non-empty
    const persisted = (this.block as any).componentState?.activeTab;
    if (persisted && d.tabKeys.includes(persisted) && d[persisted]?.length) {
      this._activeTab = persisted;
    } else if (!this._activeTab || !d.tabKeys.includes(this._activeTab)) {
      this._activeTab =
        d.tabKeys.find((key) => d[key] && Array.isArray(d[key]) && d[key].length) ||
        d.tabKeys[0] ||
        '';
    }
  }

  private _onTabChange(e: CustomEvent) {
    const d = this.block.data?.details as Details;
    if (!d?.tabKeys) return;
    const tabIndex = e.detail?.tabIndex ?? 0;
    const tabKey = d.tabKeys.filter((k) => d[k] && Array.isArray(d[k]) && d[k].length)[tabIndex];
    if (tabKey) {
      this._activeTab = tabKey;
      // Persist active tab in componentState
      if (this.block) {
        (this.block as any).componentState = {
          ...((this.block as any).componentState || {}),
          activeTab: tabKey
        };
      }
    }
  }

  private _toggleExpanded(key: string) {
    this._expandedStates = {
      ...this._expandedStates,
      [key]: !this._expandedStates[key]
    };
  }

  private _copyField(value: string, label: string, shouldCopyLabel: boolean, stateKey: string) {
    const text = shouldCopyLabel ? `${label}: ${value}` : value;
    navigator.clipboard.writeText(text);
    this._copiedStates = { ...this._copiedStates, [stateKey]: true };
    setTimeout(() => {
      this._copiedStates = { ...this._copiedStates, [stateKey]: false };
    }, 3000);
  }

  private _beforeCopy = async () => {
    this.shadowRoot?.querySelectorAll('[data-pi-card]').forEach((card: any) => {
      if (typeof card.expanded !== 'undefined') {
        card.expanded = true;
      }
    });
    await this.updateComplete;
  };

  private _afterCopy = async () => {
    // No-op: cards remain expanded after copy
  };

  private async _launchScan() {
    const d = this.block.data?.details as any;
    const meta = d?._scanMeta;
    if (!meta?.entityValue) return;

    this._scanLaunching = true;
    this._scanError = null;
    this._scanResult = null;
    this._scanStatus = null;

    try {
      const result = (await this.sendIntegrationMessage({
        action: 'LAUNCH_SCAN',
        entityValue: meta.entityValue
      })) as any;
      this._scanResult = {
        scanRef: result.scanRef,
        scanTitle: result.scanTitle,
        message: result.message
      };
      // Persist to block data so it survives component destruction
      this.block.data!.details = { ...(this.block.data!.details as object), _scanResult: result };
    } catch (error: any) {
      this._scanError = error?.message || 'Failed to launch scan';
    } finally {
      this._scanLaunching = false;
    }
  }

  private async _checkScanStatus() {
    const scanRef =
      this._scanResult?.scanRef || (this.block.data?.details as any)?._scanResult?.scanRef;
    if (!scanRef) return;

    this._scanCheckingStatus = true;
    this._scanError = null;

    try {
      const result = (await this.sendIntegrationMessage({
        action: 'CHECK_SCAN_STATUS',
        scanRef
      })) as any;
      this._scanStatus = { ref: result.ref, state: result.state, subState: result.subState };
      // Persist
      this.block.data!.details = {
        ...(this.block.data!.details as object),
        _scanStatus: result
      };
    } catch (error: any) {
      this._scanError = error?.message || 'Failed to check scan status';
    } finally {
      this._scanCheckingStatus = false;
    }
  }

  render() {
    const d = this.block.data?.details as Details | undefined;
    if (!d?.tabKeys?.length) return nothing;

    const visibleTabs = d.tabKeys.filter((key) => d[key] && Array.isArray(d[key]) && d[key].length);

    if (!visibleTabs.length) return nothing;

    const activeIndex = Math.max(0, visibleTabs.indexOf(this._activeTab));

    return html`
      <div class="content-wrapper">
        <div class="copy-btn-container">
          <pi-copy-button
            copy-content-id=${this._copyContentId}
            condensed
            button-type="tertiary"
            button-text=""
            .beforeCopy=${this._beforeCopy}
            .afterCopy=${this._afterCopy}
          ></pi-copy-button>
        </div>
        <div id=${this._copyContentId}>
          ${visibleTabs.length === 1
            ? this._renderTabContent(d[visibleTabs[0]] as DisplayField[], visibleTabs[0])
            : html`
                <pi-tab-group @pi-tab-change=${this._onTabChange}>
                  ${visibleTabs.map(
                    (tabKey, idx) => html`
                      <pi-tab
                        slot="tab"
                        panel=${tabKey}
                        ?active=${idx === activeIndex}
                        .count=${tabKey === 'scans'
                          ? this._countScanGroups(d[tabKey] as DisplayField[])
                          : (d[tabKey] as DisplayField[]).length}
                      >
                        ${humanizeTabKey(tabKey)}
                      </pi-tab>
                    `
                  )}
                  ${visibleTabs.map(
                    (tabKey, idx) => html`
                      <pi-tab-panel slot="panel" ?active=${idx === activeIndex}>
                        ${this._renderTabContent(d[tabKey] as DisplayField[], tabKey)}
                      </pi-tab-panel>
                    `
                  )}
                </pi-tab-group>
              `}
        </div>
      </div>
    `;
  }

  private _renderTabContent(fields: DisplayField[] | DisplayField[][], tabKey?: string) {
    if (!fields?.length) return nothing;

    if (Array.isArray(fields[0])) {
      return html`
        <div class="tab-content">
          ${(fields as DisplayField[][]).map((group) => this._renderKnowledgeBaseCard(group))}
        </div>
      `;
    }

    if (tabKey === 'scans') {
      return html`
        <div class="tab-content">
          ${this._renderScanActions()} ${this._renderScansContent(fields as DisplayField[])}
        </div>
      `;
    }

    return html`
      <div class="tab-content">
        ${(fields as DisplayField[]).map((field, idx) => this._renderDisplayField(field, idx))}
      </div>
    `;
  }

  private _renderKnowledgeBaseCard(group: DisplayField[]) {
    const titleField = group.find((f) => f.isTitle);
    const title = titleField?.value || titleField?.label || '';
    const bodyFields = group.filter((f) => !f.isTitle && !f.isNewSectionLineBreak);
    return html`
      <pi-card card-title=${title} collapsible expanded data-pi-card>
        ${bodyFields.map((field, idx) => this._renderDisplayField(field, idx))}
      </pi-card>
    `;
  }

  private _renderScanActions() {
    const d = this.block.data?.details as any;
    const meta = d?._scanMeta;
    const isIp = meta?.entityType === 'IPv4' || meta?.entityType === 'IPv6';

    if (!meta?.enableScanLaunch || !isIp) return nothing;

    // Restore persisted results
    const scanResult = this._scanResult || d?._scanResult;
    const scanStatus = this._scanStatus || d?._scanStatus;

    return html`
      <div class="scan-actions">
        ${!scanResult
          ? html`
              <pi-button
                button-type="secondary"
                size="sm"
                .icon=${faPlay}
                ?disabled=${this._scanLaunching}
                @click=${() => this._launchScan()}
              >
                ${this._scanLaunching ? 'Launching…' : 'Launch Scan'}
              </pi-button>
            `
          : html`
              <pi-key-value
                key="Scan Launched"
                value=${scanResult.scanTitle || scanResult.message || ''}
              ></pi-key-value>
              <pi-key-value key="Reference" value=${scanResult.scanRef || ''}></pi-key-value>
              ${scanStatus
                ? html`
                    <pi-key-value
                      key="Status"
                      value="${scanStatus.state}${scanStatus.subState
                        ? ` (${scanStatus.subState})`
                        : ''}"
                    ></pi-key-value>
                  `
                : nothing}
              <pi-button
                button-type="tertiary"
                size="sm"
                .icon=${faRotate}
                ?disabled=${this._scanCheckingStatus}
                @click=${() => this._checkScanStatus()}
              >
                ${this._scanCheckingStatus ? 'Checking…' : 'Check Status'}
              </pi-button>
            `}
        ${this._scanError
          ? html`<pi-error
              variant="danger"
              open
              error-title="Scan Error"
              .message=${this._scanError}
            ></pi-error>`
          : nothing}
      </div>
    `;
  }

  private _countScanGroups(fields: DisplayField[]): number {
    return fields.filter((f) => f.isNewSectionLineBreak).length;
  }

  private _renderScansContent(fields: DisplayField[]) {
    const MAX_SCANS = 10;

    // Group flat fields into per-scan arrays (split on isNewSectionLineBreak)
    const groups: DisplayField[][] = [];
    let current: DisplayField[] = [];
    for (const field of fields) {
      if (field.isNewSectionLineBreak) {
        if (current.length) {
          groups.push(current);
          current = [];
        }
      } else {
        current.push(field);
      }
    }
    if (current.length) groups.push(current);

    const totalScans = groups.length;
    const visibleGroups = groups.slice(0, MAX_SCANS);

    return html`
      ${totalScans > MAX_SCANS
        ? html`<div class="scan-count-message">
            Showing first ${MAX_SCANS} of ${totalScans} scans
          </div>`
        : nothing}
      <pi-show-more max-lines="10">
        <div class="scan-list">
          ${visibleGroups.map(
            (group) => html`
              <div class="scan-item">
                ${group.map((field, idx) => this._renderDisplayField(field, idx))}
              </div>
            `
          )}
        </div>
      </pi-show-more>
    `;
  }

  private _renderDisplayField(field: DisplayField, fieldIndex: number) {
    if (field.isTitle) {
      return this._renderTitle(field);
    }
    if (field.isTextBlock) {
      return this._renderTextBlock(field);
    }
    if (field.isListOfLinks) {
      return this._renderListOfLinks(field);
    }
    if (field.isHtml) {
      return this._renderHtmlField(field);
    }
    if (field.isList) {
      return this._renderList(field, fieldIndex);
    }
    if (field.isNewSectionLineBreak) {
      return html`<hr class="section-break" />`;
    }
    if (field.fieldIsCopyable) {
      return this._renderCopyableField(field, fieldIndex, 0);
    }
    return this._renderKeyValue(field);
  }

  private _renderTitle(field: DisplayField) {
    const indentClass = field.indent ? `indent-${field.indent}` : '';
    const labelText = field.capitalize
      ? capitalizeStr(field.label || field.value || '')
      : field.label || field.value || '';

    if (field.displayLink && (field.value || field.label)) {
      if (field.showLabelAndValue) {
        return html`
          <h2 class=${indentClass}>
            <pi-external-link
              href=${field.displayLink}
              text="${field.label}: ${field.value}"
            ></pi-external-link>
          </h2>
        `;
      }
      return html`
        <h2 class=${indentClass}>
          <pi-external-link href=${field.displayLink} text=${labelText}></pi-external-link>
        </h2>
      `;
    }

    if (field.showLabelAndValue) {
      return html`<h2 class=${indentClass}>${field.label}: ${field.value}</h2>`;
    }

    return html`<h2 class=${indentClass}>${labelText}</h2>`;
  }

  private _renderTextBlock(field: DisplayField) {
    const indentClass = `indent-${field.indent || 0}`;
    const text = field.capitalize ? capitalizeStr(field.value) : field.value;
    return html`<div class="text-block ${indentClass}">${text}</div>`;
  }

  private _renderListOfLinks(field: DisplayField) {
    const indentClass = `indent-${field.indent || 0}`;
    const links = field.value as Array<{ url: string; id: string; capitalize?: boolean }>;
    return html`
      <div class="field-row list-of-links ${indentClass}">
        <span class="kv-key">${field.label}:</span>
        <span class="link-list">
          ${links.map(
            // prettier-ignore
            (link, i) => html`<pi-external-link
                href=${link.url}
                text=${link.capitalize ? capitalizeStr(link.id) : link.id}
                no-icon
              ></pi-external-link>${i < links.length - 1
                ? html`<span class="link-separator">, </span>`
                : nothing}`
          )}
        </span>
      </div>
    `;
  }

  private _renderHtmlField(field: DisplayField) {
    return html`
      <pi-section-header title=${field.label || ''} show-collapse-button is-collapsed>
        <div class="html-content">${unsafeHTML(field.value)}</div>
      </pi-section-header>
    `;
  }

  private _renderList(field: DisplayField, fieldIndex: number) {
    const items = field.value as DisplayField[][];
    if (!items?.length) return nothing;

    return html`
      <div class="list-section">
        <h3>${field.label}</h3>
        <div class="list-items">
          ${items.map((itemFields, itemIdx) =>
            field.collapsibleListItems
              ? this._renderCollapsibleListItem(field, fieldIndex, itemFields, itemIdx)
              : this._renderFlatListItem(itemFields, fieldIndex, itemIdx)
          )}
        </div>
      </div>
    `;
  }

  private _renderCollapsibleListItem(
    parentField: DisplayField,
    fieldIndex: number,
    itemFields: DisplayField[],
    itemIdx: number
  ) {
    const stateKey = `${fieldIndex}-${itemIdx}-${parentField.label}`;
    const isExpanded = !!this._expandedStates[stateKey];
    const headerValue = itemFields[0]?.value ?? '';

    return html`
      <div>
        <button
          class="expandable-title"
          @click=${() => this._toggleExpanded(stateKey)}
          aria-expanded=${isExpanded}
        >
          <span class="expandable-title-text">${headerValue}</span>
          <pi-icon .icon=${isExpanded ? faAngleUp : faAngleDown} size="sm"></pi-icon>
        </button>
        ${isExpanded
          ? html`
              <div class="list-item-fields">
                ${itemFields
                  .slice(1)
                  .map((itemField, subIdx) =>
                    this._renderListItemField(itemField, fieldIndex, subIdx + 1)
                  )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderFlatListItem(itemFields: DisplayField[], fieldIndex: number, _itemIdx: number) {
    return html`
      <div class="list-item-fields">
        ${itemFields.map((itemField, subIdx) =>
          this._renderListItemField(itemField, fieldIndex, subIdx)
        )}
      </div>
    `;
  }

  private _renderListItemField(field: DisplayField, fieldIndex: number, subIndex: number) {
    const value = field.isDate ? formatDate(field.value) : field.value;
    const copyStateKey = `${fieldIndex}-${field.label}-${subIndex}`;

    if (field.fieldIsCopyable) {
      return html`
        <div class="copyable-field">
          <pi-key-value key=${field.label || ''} value=${value || ''}></pi-key-value>
          <button
            class="copy-inline-btn"
            title="Copy ${field.label}"
            @click=${() =>
              this._copyField(
                String(field.value),
                field.label || '',
                !!field.shouldCopyFieldLabel,
                copyStateKey
              )}
          >
            <pi-icon .icon=${faCopy} size="sm"></pi-icon>
          </button>
          ${this._copiedStates[copyStateKey]
            ? html`<span class="copied-label">Copied</span>`
            : nothing}
        </div>
      `;
    }

    return html` <pi-key-value key=${field.label || ''} value=${value || ''}></pi-key-value> `;
  }

  private _renderCopyableField(field: DisplayField, fieldIndex: number, subIndex: number) {
    const indentClass = `indent-${field.indent || 0}`;
    const value = field.isDate
      ? formatDate(field.value)
      : field.capitalize
        ? capitalizeStr(field.value)
        : field.value;
    const copyStateKey = `${fieldIndex}-${field.label}-${subIndex}`;

    return html`
      <div class="copyable-field ${indentClass}">
        <pi-key-value key=${field.label || ''} value=${value || ''}></pi-key-value>
        <button
          class="copy-inline-btn"
          title="Copy ${field.label}"
          @click=${() =>
            this._copyField(
              String(field.value),
              field.label || '',
              !!field.shouldCopyFieldLabel,
              copyStateKey
            )}
        >
          <pi-icon .icon=${faCopy} size="sm"></pi-icon>
        </button>
        ${this._copiedStates[copyStateKey]
          ? html`<span class="copied-label">Copied</span>`
          : nothing}
      </div>
    `;
  }

  private _renderKeyValue(field: DisplayField) {
    const indentClass = `indent-${field.indent || 0}`;

    if (field.isDate) {
      return html`
        <div class=${indentClass}>
          <pi-key-value key=${field.label || ''} value=${formatDate(field.value)}></pi-key-value>
        </div>
      `;
    }

    if (field.displayLink) {
      const displayText = field.capitalize ? capitalizeStr(field.value) : field.value;
      return html`
        <div class="field-row ${indentClass}">
          <span class="kv-key">${field.label}:</span>
          <pi-external-link href=${field.displayLink} text=${displayText}></pi-external-link>
        </div>
      `;
    }

    const value = field.capitalize ? capitalizeStr(field.value) : field.value;
    return html`
      <div class=${indentClass}>
        <pi-key-value key=${field.label || ''} value=${value ?? ''}></pi-key-value>
      </div>
    `;
  }
}
