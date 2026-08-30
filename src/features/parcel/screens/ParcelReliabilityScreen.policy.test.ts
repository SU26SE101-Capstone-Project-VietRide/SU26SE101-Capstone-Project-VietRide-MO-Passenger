import fs from 'node:fs';
import path from 'node:path';

describe('Parcel Reliability hub request policy', () => {
  const source = fs.readFileSync(
    path.join(__dirname, 'ParcelReliabilityScreen.tsx'),
    'utf8',
  );

  it('uses Trace as the only initial Parcel read and avoids incident/claim fan-out', () => {
    expect(source).toContain('useParcelTrace(parcelId)');
    expect(source).not.toContain('useParcelDetail(');
    expect(source).not.toContain('useParcelClaims(');
    expect(source).not.toContain('useParcelIncidents(');
    expect(source).not.toContain('getParcelIncidents(');
    expect(source).not.toContain('getParcelClaims(');
  });

  it('uses opaque cursor pagination and deduplicates timeline events by event ID', () => {
    expect(source).toContain('traceQuery.fetchNextPage()');
    expect(source).toContain('seen.has(event.eventId)');
    expect(source).toContain('seen.add(event.eventId)');
  });

  it('virtualizes both Reliability layouts without nesting a timeline list', () => {
    expect(source).toContain('<FlashList');
    expect(source).toContain('detailsListSection={timelineListSection}');
    expect(source).not.toContain('{timeline.map((event');
    expect(source).not.toContain('<ScrollView');
  });

  it('drives map and Reliability CTAs from Trace contract fields', () => {
    expect(source).toContain('tripId={liveTrackingTrip.tripId}');
    expect(source).toContain("trace?.availableActions.includes('REPORT_INCIDENT')");
    expect(source).toContain("trace?.availableActions.includes('SUBMIT_CLAIM')");
    expect(source).toContain("trace?.availableActions.includes('APPEAL')");
  });
});
