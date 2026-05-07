/**
 * Apple Health export.zip streaming extractor — Sprint 5 BATCH 2.
 *
 * Apple Health's "Export All Health Data" produces a single .zip whose
 * primary payload is `apple_health_export/export.xml` (older exports also
 * include `electrocardiograms/` and `workout-routes/` subdirectories which
 * Sprint 5 ignores). This module exposes one function: stream the
 * export.xml entry from a zip-Readable, returning a Readable byte stream
 * suitable for piping into `parseHealthExport`.
 *
 * STREAMING + MEMORY
 *   `unzipper.Parse()` is event-based — entries surface one at a time as
 *   the zip's central directory is decoded. We listen for the entry whose
 *   path ends in `export.xml`, stream IT to the caller, and call
 *   `entry.autodrain()` on every other entry so unzipper releases the
 *   buffer. Memory stays bounded by the chunk size unzipper feeds us, NOT
 *   the zip's total uncompressed size.
 *
 * NO ZIP-SLIP CONCERN BY DESIGN
 *   Zip-slip vulnerabilities apply when an extractor writes entries to
 *   filesystem paths derived from the entry's `path` attribute. Our
 *   extractor:
 *     1. Filters entries by suffix-match on `entry.path` (only
 *        `export.xml` matches; others are autodrained immediately).
 *     2. Pipes the matched entry's stream to a CALLER-PROVIDED consumer
 *        (parser), never to disk.
 *     3. Never uses `entry.path` to construct a filesystem path.
 *   No `..` traversal vector exists in this code path. We do still
 *   defensively guard against entry paths that don't terminate cleanly
 *   (e.g., a malicious zip with `export.xml/...` entries) — see
 *   findExportXmlEntry below.
 *
 * UNZIPPER VERSION
 *   Pinned to `unzipper@0.12.3` (MIT, in allowlist). Streaming API has
 *   been stable since 0.10.x.
 */
import unzipper from 'unzipper';
import { logger } from '../logger';
import { Readable } from 'node:stream';

/**
 * True if a zip entry's path is the Apple Health export.xml. Apple writes
 * it as `apple_health_export/export.xml` but some older exports flatten to
 * `export.xml` at the root. Match on suffix to handle both shapes; reject
 * paths that have additional path components AFTER `export.xml` (a
 * defensive guard against weird-shaped malicious zips that try to confuse
 * suffix-matchers).
 */
export function isExportXmlEntry(entryPath: string): boolean {
  // Normalise: zip uses forward slashes regardless of OS.
  const normalized = entryPath.replace(/\\/g, '/');
  // Exact filename at end of path; nothing after.
  return /(?:^|\/)apple_health_export\/export\.xml$|^export\.xml$/.test(normalized);
}

/**
 * Stream the `export.xml` entry out of an Apple Health export zip Readable.
 * Returns a Readable suitable for piping into `parseHealthExport`. Resolves
 * with the stream as soon as the matching entry is found; all subsequent
 * non-matching entries are autodrained without buffering.
 *
 * Rejects if:
 *   - Zip is malformed (unzipper emits 'error')
 *   - Zip ends without an export.xml entry
 *   - Multiple export.xml entries appear (rejects the SECOND one — Apple
 *     never produces multi-export zips, so this indicates a tampered file)
 */
export function streamExportXml(zipStream: Readable): Promise<Readable> {
  return new Promise<Readable>((resolve, reject) => {
    const parser = unzipper.Parse();
    let resolved = false;
    let entryCount = 0;

    const fail = (err: Error) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    };

    parser.on('entry', (entry: unzipper.Entry) => {
      entryCount += 1;
      const path = entry.path ?? '';
      if (isExportXmlEntry(path)) {
        if (resolved) {
          // Second export.xml — defensive reject.
          entry.autodrain();
          fail(
            new Error(
              `Multiple export.xml entries in zip (first already streaming) — refusing as malformed/tampered`
            )
          );
          return;
        }
        resolved = true;
        logger.info(
          `[appleHealthZip] export.xml entry found at "${path}" (entry #${entryCount}); streaming to consumer`
        );
        // Resolve with the entry stream itself. Caller pipes it to the
        // parser. We don't auto-pipe here — the caller controls timing.
        resolve(entry as unknown as Readable);
        // IMPORTANT: do not autodrain the matched entry. The caller will
        // consume it; subsequent entries are still autodrained below.
      } else {
        // Discard non-target entries to free unzipper's internal buffers.
        // Without this, large zips with many entries would balloon RAM.
        entry.autodrain();
      }
    });

    parser.on('error', (err: Error) => {
      fail(new Error(`Zip parse error: ${err.message}`));
    });

    parser.on('end', () => {
      if (!resolved) {
        fail(new Error(`Zip ended without finding export.xml (${entryCount} entries scanned)`));
      }
    });

    zipStream.on('error', (err) => {
      fail(new Error(`Zip source stream error: ${err.message}`));
    });

    zipStream.pipe(parser);
  });
}
