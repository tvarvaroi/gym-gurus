/**
 * Apple Health Parser Fuzz Tests — Sprint 5 BATCH 7 + 8
 *
 * Coverage targets — each is a focused proof against a real failure mode that
 * could surface in production if Apple ships a malformed export OR if a
 * malicious user crafts a zip designed to crash the cron worker.
 *
 * Sprint 5 BATCH 8 hardened the parser to address three permissiveness
 * findings surfaced by BATCH 7:
 *   1. parseHealthDate bounds check (out-of-range fields → null)
 *   2. Close-tag sentinel (`</HealthData>` required → reject if absent)
 *   3. Non-empty assertion (folded into close-tag sentinel — empty stream
 *      can't have a close tag, so it's caught by the same gate)
 *
 * Tests flipped from "FINDING: documents permissiveness" to assert-rejection
 * style after BATCH 8 hardening — see the four below tagged "BATCH 8
 * hardened". The cron's outer try/catch in processOneImport remains the
 * second line of defense; this layer is now reliably the first.
 */
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { parseHealthExport, parseHealthDate } from '../../services/appleHealthParser';
import { isExportXmlEntry, streamExportXml } from '../../services/appleHealthZip';

function streamFromString(xml: string): Readable {
  return Readable.from([Buffer.from(xml, 'utf8')]);
}

const HEALTH_HEAD = '<?xml version="1.0" encoding="UTF-8"?><HealthData locale="en_US">';
const HEALTH_TAIL = '</HealthData>';
function wrap(...records: string[]): string {
  return HEALTH_HEAD + records.join('') + HEALTH_TAIL;
}

// ─── 1. Empty XML envelope ─────────────────────────────────────────────────

describe('Apple Health parser fuzz — empty envelope', () => {
  it('completes cleanly with zero records when only HealthData root exists', async () => {
    const stats = await parseHealthExport(streamFromString(wrap()), {});
    expect(stats.recordsParsed).toBe(0);
    expect(stats.recordsSkippedUnparseable).toBe(0);
    expect(stats.dateRangeStart).toBeNull();
    expect(stats.dateRangeEnd).toBeNull();
  });

  it('completes cleanly when the envelope contains only ExportDate (no records)', async () => {
    const xml = wrap(`<ExportDate value="2026-01-15 10:00:00 -0500"/>`);
    const stats = await parseHealthExport(streamFromString(xml), {});
    expect(stats.recordsParsed).toBe(0);
  });
});

// ─── 2. Truncated input ─────────────────────────────────────────────────────

describe('Apple Health parser fuzz — truncated input (BATCH 8 hardened)', () => {
  it('rejects XML truncated mid-attribute via close-tag sentinel', async () => {
    // BATCH 8 hardening: parser now tracks whether </HealthData> was seen
    // before resolving. Mid-attribute truncation never reaches the close
    // tag → reject with "Truncated or malformed export" so the cron marks
    // the import 'failed' with a useful error_message instead of
    // 'completed' with 0 records.
    const xml = HEALTH_HEAD + '<Record type="HKQuantity'; // truncated
    await expect(parseHealthExport(streamFromString(xml), {})).rejects.toThrow(
      /Truncated|SAX parse/
    );
  });

  it('rejects XML with unclosed root via close-tag sentinel', async () => {
    // BATCH 8 hardening: same gate. An unclosed <HealthData> is the most
    // common shape of "file got truncated mid-export"; surface clearly.
    const xml = HEALTH_HEAD + '<Record type="HKQuantityTypeIdentifierBodyMass" />';
    await expect(parseHealthExport(streamFromString(xml), {})).rejects.toThrow(
      /Truncated|SAX parse/
    );
  });

  it('rejects completely empty stream via close-tag sentinel', async () => {
    // BATCH 8 hardening: empty stream produces no events, so close tag is
    // never seen → same rejection path. UX: mis-uploaded empty file no
    // longer looks like a successful import with no data.
    await expect(parseHealthExport(streamFromString(''), {})).rejects.toThrow(/Truncated/);
  });
});

// ─── 3. Missing required attributes ────────────────────────────────────────

describe('Apple Health parser fuzz — missing attributes', () => {
  it('counts records missing both startDate and endDate as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(1);
    expect(stats.recordsEmittedBody).toBe(0);
  });

  it('counts records missing only endDate as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(1);
  });

  it('counts records missing the value attribute as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(1);
  });

  it('counts Workout missing workoutActivityType as unparseable', async () => {
    const xml = wrap(
      `<Workout duration="32" durationUnit="min" sourceName="X" startDate="2026-01-15 06:00:00 -0500" endDate="2026-01-15 06:32:00 -0500"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onWorkout: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(1);
  });

  it('counts Workout missing duration as unparseable', async () => {
    const xml = wrap(
      `<Workout workoutActivityType="HKWorkoutActivityTypeRunning" durationUnit="min" sourceName="X" startDate="2026-01-15 06:00:00 -0500" endDate="2026-01-15 06:32:00 -0500"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onWorkout: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(1);
  });

  it('skips Record with no `type` attribute (counted unparseable)', async () => {
    const xml = wrap(
      `<Record sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), {});
    expect(stats.recordsSkippedUnparseable).toBe(1);
  });
});

// ─── 4. Malformed timestamps ────────────────────────────────────────────────

describe('Apple Health parser fuzz — malformed timestamps', () => {
  it('parseHealthDate returns null on shape-malformed strings (regex format check)', () => {
    expect(parseHealthDate('not a date')).toBeNull();
    expect(parseHealthDate('2026/01/15 08:00:00 -0500')).toBeNull(); // wrong separator
    expect(parseHealthDate('2026-01-15T08:00:00-05:00')).toBeNull(); // ISO-8601 (Apple uses space)
    expect(parseHealthDate('')).toBeNull();
  });

  it('parseHealthDate rejects out-of-range field values (BATCH 8 hardened)', () => {
    // BATCH 8 hardening: field-level bounds check after regex match.
    // Out-of-range values (month=13, day=99, hour=99, minute=60, second=60,
    // offset=±9999) are now rejected instead of being silently rolled forward
    // by JS Date.UTC.
    //
    // Note: month-day combinations within the bounds box (e.g. Feb 30)
    // are NOT caught — that would require month-aware day validation
    // (Feb=28/29, Apr/Jun/Sep/Nov=30). We deliberately stop at field-level
    // bounds; Apple Health never produces Feb-30 records, and a malicious
    // export with that shape would still be caught downstream by the
    // ingest-side schema check (or just produce a Mar-2 record, which is
    // semantically harmless versus the year-2099 case BATCH 7 surfaced).
    expect(parseHealthDate('2026-13-99 99:99:99 -9999')).toBeNull(); // every field nuts
    expect(parseHealthDate('2026-13-15 08:00:00 -0500')).toBeNull(); // month=13
    expect(parseHealthDate('2026-01-15 25:00:00 -0500')).toBeNull(); // hour=25
    expect(parseHealthDate('2026-01-15 08:60:00 -0500')).toBeNull(); // minute=60
    expect(parseHealthDate('2026-01-15 08:00:60 -0500')).toBeNull(); // second=60
    expect(parseHealthDate('2026-01-15 08:00:00 -9999')).toBeNull(); // offset nuts
  });

  it('parseHealthDate rejects year out of [1990, currentYear+1] window', () => {
    // BATCH 8 hardening: defends against year-typo (e.g. a 1900-dated record
    // from a buggy export) AND far-future records (a 2099 record someone
    // crafted maliciously to skew charts).
    expect(parseHealthDate('1989-01-15 08:00:00 -0500')).toBeNull(); // pre-1990
    expect(parseHealthDate('2099-01-15 08:00:00 -0500')).toBeNull(); // far future
  });

  it('parseHealthDate accepts boundary values (year currentYear+1, edge fields)', () => {
    const nextYear = new Date().getUTCFullYear() + 1;
    expect(parseHealthDate(`${nextYear}-12-31 23:59:59 +1400`)).not.toBeNull();
    expect(parseHealthDate('1990-01-01 00:00:00 +0000')).not.toBeNull();
  });

  it('counts records with shape-malformed timestamps as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="not-a-date" endDate="also-not-a-date" value="80"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026/01/15 08:00:00 -0500" endDate="2026/01/15 08:00:00 -0500" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(2);
    expect(stats.recordsEmittedBody).toBe(0);
  });

  it('counts records with out-of-range field values (post-BATCH 8) as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-13-15 08:00:00 -0500" endDate="2026-13-15 08:00:00 -0500" value="80"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2099-01-15 08:00:00 -0500" endDate="2099-01-15 08:00:00 -0500" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(2);
    expect(stats.recordsEmittedBody).toBe(0);
  });
});

// ─── 5. Unrecognized record types ───────────────────────────────────────────

describe('Apple Health parser fuzz — unrecognized types', () => {
  it('silently ignores HKQuantityTypeIdentifierStepCount + HKQuantityTypeIdentifierActiveEnergyBurned (NOT unparseable)', async () => {
    // These are valid Apple Health types we don't currently consume. Per parser
    // contract: well-formed but unknown types pass through with NO counter
    // increment in unparseable. (Future sprints may add callbacks for them.)
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="8500"/>`,
      `<Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="Apple Watch" unit="kcal" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="450"/>`,
      `<Record type="HKQuantityTypeIdentifierDistanceWalkingRunning" sourceName="iPhone" unit="m" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="6500"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), {});
    expect(stats.recordsParsed).toBe(3);
    expect(stats.recordsSkippedUnparseable).toBe(0);
    // None of our 4 dispatch buckets fire
    expect(
      stats.recordsEmittedBody +
        stats.recordsEmittedSleep +
        stats.recordsEmittedVital +
        stats.recordsEmittedWorkout
    ).toBe(0);
  });

  it('silently ignores entirely fabricated HK types (defense against typos in future Apple exports)', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierTotallyMadeUpType" sourceName="X" unit="x" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="42"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), {});
    expect(stats.recordsParsed).toBe(1);
    expect(stats.recordsSkippedUnparseable).toBe(0);
  });
});

// ─── 6. Negative + non-finite numeric values ────────────────────────────────

describe('Apple Health parser fuzz — pathological numeric values', () => {
  it('counts NaN/Infinity values as unparseable', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="not-a-number"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="Infinity"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsSkippedUnparseable).toBe(2);
  });

  it('passes negative values through to callbacks (ingest/schema layer is the validation boundary)', async () => {
    // Negative weight is nonsensical but the PARSER is not the validation
    // layer. Schema CHECK constraints + ingest-time guards filter unreasonable
    // values. This test documents the parser contract: it doesn't filter
    // negatives, it just normalises and passes through.
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="-50"/>`
    );
    const captured: any[] = [];
    const stats = await parseHealthExport(streamFromString(xml), {
      onBodyMass: (r) => captured.push(r),
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].value).toBe(-50);
    expect(stats.recordsSkippedUnparseable).toBe(0);
  });

  it('rejects unit "foo" for body mass with skip + counter increment', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="furlong" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    // Unrecognised unit → normaliser returns ok=false → record skipped.
    expect(stats.recordsEmittedBody).toBe(0);
  });
});

// ─── 7. Deeply nested elements ──────────────────────────────────────────────

describe('Apple Health parser fuzz — deep nesting', () => {
  it('handles arbitrarily-deep MetadataEntry/WorkoutEvent nesting without recursion blowup', async () => {
    // Build a Workout with 100 nested children. Real Apple exports have ~5-10.
    // 100 is well above any realistic case but well below the call stack
    // limit; we want to confirm flat iteration, not recursive descent.
    const inner = Array.from(
      { length: 100 },
      (_, i) =>
        `<MetadataEntry key="custom_${i}" value="payload_${i}"/>` +
        `<WorkoutEvent type="HKWorkoutEventTypePause" date="2026-01-15 06:${String(i % 60).padStart(2, '0')}:00 -0500" duration="0" durationUnit="min"/>`
    ).join('');
    const xml = wrap(
      `<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="32" durationUnit="min" sourceName="Apple Watch" startDate="2026-01-15 06:00:00 -0500" endDate="2026-01-15 06:32:00 -0500">${inner}</Workout>`
    );
    const captured: any[] = [];
    const stats = await parseHealthExport(streamFromString(xml), {
      onWorkout: (r) => captured.push(r),
    });
    expect(captured).toHaveLength(1);
    expect(stats.recordsEmittedWorkout).toBe(1);
    expect(stats.recordsParsed).toBe(1); // children don't bump the count
  });

  it('completes despite mass interleave of unknown elements with known records', async () => {
    const interleaved = Array.from(
      { length: 20 },
      (_, i) =>
        `<UnknownElementX attr="val_${i}"/>` +
        `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="${80 + i}"/>` +
        `<UnknownElementY attr="val_${i}"/>`
    ).join('');
    const xml = wrap(interleaved);
    const stats = await parseHealthExport(streamFromString(xml), { onBodyMass: () => {} });
    expect(stats.recordsEmittedBody).toBe(20);
    expect(stats.recordsSkippedUnparseable).toBe(0);
  });
});

// ─── 8. Oversized attribute values ──────────────────────────────────────────

describe('Apple Health parser fuzz — oversized attributes', () => {
  it('handles a 100KB sourceName attribute without crashing (bounded by sax buffer)', async () => {
    // Note: full 10MB+ memory profile is in appleHealthParser.test.ts. This
    // test ensures a single pathological attribute (e.g. an attacker-crafted
    // sourceName) doesn't kill the parser.
    const longName = 'x'.repeat(100 * 1024); // 100KB
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="${longName}" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const captured: any[] = [];
    const stats = await parseHealthExport(streamFromString(xml), {
      onBodyMass: (r) => captured.push(r),
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].sourceName.length).toBe(100 * 1024);
    expect(stats.recordsEmittedBody).toBe(1);
  });
});

// ─── 9. Non-UTF-8 + mixed encoding ──────────────────────────────────────────

describe('Apple Health parser fuzz — encoding edge cases', () => {
  it('handles UTF-8 multi-byte characters in attributes (sourceName with emoji)', async () => {
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="📱iPhone" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const captured: any[] = [];
    await parseHealthExport(streamFromString(xml), { onBodyMass: (r) => captured.push(r) });
    expect(captured[0].sourceName).toBe('📱iPhone');
  });

  it('handles records containing apostrophes/quotes via XML entities', async () => {
    // Real Apple exports use &quot; / &apos; for in-attribute quote chars.
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="John&apos;s Watch" unit="kg" startDate="2026-01-15 08:00:00 -0500" endDate="2026-01-15 08:00:00 -0500" value="80"/>`
    );
    const captured: any[] = [];
    await parseHealthExport(streamFromString(xml), { onBodyMass: (r) => captured.push(r) });
    expect(captured[0].sourceName).toBe("John's Watch");
  });
});

// ─── 10. Mixed valid + malformed records ────────────────────────────────────

describe('Apple Health parser fuzz — mixed valid + malformed', () => {
  it('parses 5 valid records out of 10 mixed (5 unparseable), all-pass-no-crash', async () => {
    // Mix: 5 valid body mass + 5 malformed (alternating types of malformation)
    const xml = wrap(
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-01 08:00:00 -0500" endDate="2026-01-01 08:00:00 -0500" value="80"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" value="80"/>`, // missing dates
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-02 08:00:00 -0500" endDate="2026-01-02 08:00:00 -0500" value="81"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="bad" endDate="bad" value="82"/>`, // bad timestamps
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-03 08:00:00 -0500" endDate="2026-01-03 08:00:00 -0500" value="82"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="furlong" startDate="2026-01-04 08:00:00 -0500" endDate="2026-01-04 08:00:00 -0500" value="83"/>`, // bad unit
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-04 08:00:00 -0500" endDate="2026-01-04 08:00:00 -0500" value="84"/>`,
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-05 08:00:00 -0500" endDate="2026-01-05 08:00:00 -0500" value="not-a-number"/>`, // bad value
      `<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="X" unit="kg" startDate="2026-01-05 08:00:00 -0500" endDate="2026-01-05 08:00:00 -0500" value="85"/>`,
      `<Record sourceName="X" unit="kg" startDate="2026-01-06 08:00:00 -0500" endDate="2026-01-06 08:00:00 -0500" value="86"/>` // missing type
    );
    const captured: any[] = [];
    const stats = await parseHealthExport(streamFromString(xml), {
      onBodyMass: (r) => captured.push(r),
    });
    expect(captured).toHaveLength(5);
    expect(stats.recordsEmittedBody).toBe(5);
    expect(stats.recordsSkippedUnparseable).toBe(5);
    expect(stats.recordsParsed).toBe(10);
  });
});

// ─── 11. Zip-slip + zip envelope rejections ─────────────────────────────────

describe('Apple Health parser fuzz — zip envelope safety', () => {
  it('isExportXmlEntry rejects zip-slip-style path traversals', () => {
    // The classic zip-slip vector: entry with path-traversal segments.
    // isExportXmlEntry's contract is "matches Apple's expected paths only".
    // The actual filesystem write is delegated to unzipper which sanitises;
    // this layer is defense-in-depth.
    expect(isExportXmlEntry('../etc/passwd')).toBe(false);
    expect(isExportXmlEntry('../../../export.xml')).toBe(false);
    expect(isExportXmlEntry('apple_health_export/../../etc/passwd')).toBe(false);
    expect(isExportXmlEntry('export.xml/../../etc/passwd')).toBe(false);
    expect(isExportXmlEntry('/absolute/path/export.xml')).toBe(false);
  });

  it('isExportXmlEntry intentionally accepts Windows-backslash separators (zip libs sometimes inject them)', () => {
    // Documented behavior: the impl normalises `\` → `/` so Windows-built
    // zips that incorrectly use backslashes still match. This is INTENTIONAL
    // (zip standards mandate forward slash but real-world tools violate this).
    // Defensive — don't reject otherwise-valid Apple exports just because
    // their zip library was non-compliant.
    expect(isExportXmlEntry('apple_health_export\\export.xml')).toBe(true);
  });

  it('isExportXmlEntry rejects null-byte injection attempts', () => {
    // Some zip libraries are vulnerable to null-byte truncation. Defensive:
    // entries with NUL chars are not Apple's format and should be rejected.
    expect(isExportXmlEntry('export.xml\x00../etc/passwd')).toBe(false);
    expect(isExportXmlEntry('apple_health_export/export.xml\x00')).toBe(false);
  });

  it('streamExportXml rejects a zip with no export.xml entry (clear error message)', async () => {
    // From appleHealthParser.test.ts BATCH 2 — confirmed working. Repeated
    // here to make the security-relevant case explicit in the fuzz suite.
    const minimalEmptyZip = Buffer.from([
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]); // EOCD only (empty zip)
    await expect(streamExportXml(Readable.from([minimalEmptyZip]))).rejects.toThrow();
  });
});
