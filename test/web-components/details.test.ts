import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DetailsComponent } from '../../web-components/details';
import type { IBlock } from '@polarityio/pi-components';

customElements.define('test-qualys-details', DetailsComponent);

function createBlock(details: Record<string, unknown>): IBlock {
  return {
    integrationId: 'qualys-integration',
    acronym: 'QLS',
    data: { details, summary: ['Host Detections: 1'] }
  };
}

async function renderComponent(block: IBlock): Promise<DetailsComponent> {
  const el = document.createElement('test-qualys-details') as DetailsComponent;
  (el as any).services = {
    currentServer: {},
    currentUser: {},
    flashMessages: {},
    moment: {},
    notificationsData: {},
    polarityx: {},
    searchData: {},
    session: {},
    store: {},
    windowService: {},
    log: {},
    integrationMessenger: {},
    lookupService: () => undefined
  };
  el.block = block;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function getShadowHTML(el: DetailsComponent): string {
  return el.shadowRoot?.innerHTML || '';
}

describe('Qualys DetailsComponent', () => {
  let el: DetailsComponent | null = null;

  afterEach(() => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    el = null;
  });

  it('should render without errors when given valid host detection data', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          { label: 'IP Address', value: '192.168.1.1', isTitle: true, showLabelAndValue: true },
          { label: 'Host Detection ID', value: '12345' },
          { label: 'Asset Id', value: '67890' },
          { label: 'Operating System', value: 'Linux 4.15' }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('192.168.1.1');
    expect(html).toContain('IP Address');
  });

  it('should render nothing when tabKeys is empty', async () => {
    el = await renderComponent(createBlock({ tabKeys: [] }));
    const html = getShadowHTML(el);
    expect(html).not.toContain('pi-tab');
    expect(html).not.toContain('pi-key-value');
  });

  it('should render nothing when details is undefined', async () => {
    const block: IBlock = {
      integrationId: 'qualys-integration',
      acronym: 'QLS',
      data: { details: undefined as any, summary: [] }
    };
    el = await renderComponent(block);
    const html = getShadowHTML(el);
    expect(html).not.toContain('pi-key-value');
  });

  it('should render key-value pairs for standard fields', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          { label: 'Operating System', value: 'Linux 4.15' },
          { label: 'DNS', value: 'host.example.com' },
          { label: 'Category', value: 'Confirmed' }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('Linux 4.15');
    expect(html).toContain('host.example.com');
    expect(html).toContain('Confirmed');
  });

  it('should render title fields with showLabelAndValue', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          { label: 'IP Address', value: '10.0.0.1', isTitle: true, showLabelAndValue: true }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('IP Address');
    expect(html).toContain('10.0.0.1');
    expect(html).toContain('<h2');
  });

  it('should render date fields with formatted dates', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [{ label: 'Last Scanned', value: '2024-01-15T10:30:00Z', isDate: true }]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('Last Scanned');
    // Should contain a formatted date (not the raw ISO string)
    expect(html).toContain('01/15/2024');
  });

  it('should render collapsible list items for detection lists', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          {
            label: 'Detections List',
            isList: true,
            collapsibleListItems: true,
            indent: 1,
            value: [
              [
                { label: 'Detection Result', value: 'SSL Certificate' },
                { label: 'QID', value: '38623', fieldIsCopyable: true, shouldCopyFieldLabel: true },
                { label: 'Severity', value: '3' }
              ]
            ]
          }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('Detections List');
    expect(html).toContain('SSL Certificate');
    // Collapsed by default — inner fields should not be visible
    expect(html).not.toContain('Severity');
  });

  it('should render HTML content in expandable sections', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          {
            label: 'Diagnosis',
            value: '<p>This is a vulnerability description</p>',
            isHtml: true
          }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('pi-section-header');
    expect(html).toContain('Diagnosis');
    expect(html).toContain('This is a vulnerability description');
  });

  it('should render the copy button', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [{ label: 'IP', value: '192.168.1.1' }]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('pi-copy-button');
  });

  it('should render section breaks for isNewSectionLineBreak fields', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          { label: 'Field1', value: 'value1' },
          { isNewSectionLineBreak: true },
          { label: 'Field2', value: 'value2' }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('section-break');
  });

  it('should not render tabs when there is only one visible tab', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [{ label: 'Field', value: 'value' }]
      })
    );

    const html = getShadowHTML(el);
    expect(html).not.toContain('pi-tab-group');
  });

  it('should render tabs when there are multiple visible tabs', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections', 'knowledgeBase'],
        hostDetections: [{ label: 'IP', value: '192.168.1.1' }],
        knowledgeBase: [{ label: 'Title', value: 'Vuln Title', isTitle: true }]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('pi-tab-group');
    expect(html).toContain('Host Detections');
    expect(html).toContain('Knowledge Base');
  });

  it('should skip tabs with empty data arrays', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections', 'emptyTab'],
        hostDetections: [{ label: 'IP', value: '192.168.1.1' }],
        emptyTab: []
      })
    );

    const html = getShadowHTML(el);
    // Should NOT show a tab group since only one tab has data
    expect(html).not.toContain('pi-tab-group');
  });

  it('should render copyable fields with copy button', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          { label: 'QID', value: '38623', fieldIsCopyable: true, shouldCopyFieldLabel: true }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('copyable-field');
    expect(html).toContain('38623');
    expect(html).toContain('QID');
  });

  it('should render links with pi-external-link for title fields with displayLink', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          {
            label: 'Host',
            value: 'server1',
            isTitle: true,
            displayLink: 'https://example.com/host/1'
          }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('pi-external-link');
    expect(html).toContain('https://example.com/host/1');
  });

  it('should render list of links', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['hostDetections'],
        hostDetections: [
          {
            label: 'CVE IDs',
            isListOfLinks: true,
            value: [
              {
                url: 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-0001',
                id: 'CVE-2024-0001'
              },
              {
                url: 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-0002',
                id: 'CVE-2024-0002'
              }
            ]
          }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('CVE IDs');
    expect(html).toContain('CVE-2024-0001');
    expect(html).toContain('CVE-2024-0002');
    expect(html).toContain('pi-external-link');
  });

  it('should render CVE knowledge base records as pi-cards with QID title', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['knowledgeBaseRecords'],
        knowledgeBaseRecords: [
          [
            { value: 'SQL Injection Vulnerability', isTitle: true },
            { label: 'QID', value: '12345', fieldIsCopyable: true, shouldCopyFieldLabel: true },
            { label: 'Severity Level', value: '5' }
          ],
          [
            { value: 'Buffer Overflow Exploit', isTitle: true },
            { label: 'QID', value: '67890', fieldIsCopyable: true, shouldCopyFieldLabel: true },
            { label: 'Severity Level', value: '3' }
          ]
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('pi-card');
    expect(html).toContain('SQL Injection Vulnerability');
    expect(html).toContain('Buffer Overflow Exploit');
    expect(html).toContain('12345');
    expect(html).toContain('67890');
  });

  it('should render scan results as bordered items without hr separators', async () => {
    el = await renderComponent(
      createBlock({
        tabKeys: ['scans'],
        scans: [
          { label: 'Scan One', value: 'Scan One', isTitle: true },
          { label: 'Status', value: 'Finished' },
          { isNewSectionLineBreak: true },
          { label: 'Scan Two', value: 'Scan Two', isTitle: true },
          { label: 'Status', value: 'Running' },
          { isNewSectionLineBreak: true }
        ]
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('scan-item');
    expect(html).toContain('Scan One');
    expect(html).toContain('Scan Two');
    expect(html).not.toContain('section-break');
  });

  it('should show a count message when there are more than 10 scans', async () => {
    const scanFields: Record<string, unknown>[] = [];
    for (let i = 1; i <= 12; i++) {
      scanFields.push({ label: `Scan ${i}`, value: `Scan ${i}`, isTitle: true });
      scanFields.push({ label: 'Status', value: 'Finished' });
      scanFields.push({ isNewSectionLineBreak: true });
    }

    el = await renderComponent(
      createBlock({
        tabKeys: ['scans'],
        scans: scanFields
      })
    );

    const html = getShadowHTML(el);
    expect(html).toContain('scan-count-message');
    expect(html).toContain('10 of');
    expect(html).toContain('Scan 1');
    expect(html).toContain('Scan 10');
    expect(html).not.toContain('Scan 11');
    expect(html).not.toContain('Scan 12');
  });

  it('should not show a count message when there are 10 or fewer scans', async () => {
    const scanFields: Record<string, unknown>[] = [];
    for (let i = 1; i <= 5; i++) {
      scanFields.push({ label: `Scan ${i}`, value: `Scan ${i}`, isTitle: true });
      scanFields.push({ isNewSectionLineBreak: true });
    }

    el = await renderComponent(
      createBlock({
        tabKeys: ['scans'],
        scans: scanFields
      })
    );

    const html = getShadowHTML(el);
    expect(html).not.toContain('Showing first');
  });
});
