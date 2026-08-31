// Minimal, dependency-free ZIP reader for browser use. LinkedIn's data export
// arrives as a .zip of ~40 CSVs; this lets a user drop the whole zip in and we
// pull out just the files we want — no unzipping by hand, no npm dependency.
//
// Uses the standard ZIP central directory + DecompressionStream('deflate-raw'),
// which is supported in all current browsers (Chrome 80+, Firefox 113+,
// Safari 16.4+) and Node 18+. Handles stored (method 0) and deflate (method 8).

const EOCD_SIG = 0x06054b50; // End Of Central Directory
const CDH_SIG = 0x02014b50; // Central Directory Header
const LFH_SIG = 0x04034b50; // Local File Header

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  // eslint-disable-next-line no-undef
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

/** Strip any directory path, returning the lowercased base filename. */
export function zipBaseName(name: string): string {
  const parts = name.split(/[\\/]/);
  return (parts[parts.length - 1] || name).toLowerCase();
}

/**
 * Read the text of every entry whose base filename passes `wanted`.
 * Returns a map of lowercased base filename → decoded UTF-8 text.
 */
export async function readZipTextEntries(
  buffer: ArrayBuffer,
  wanted: (baseName: string) => boolean,
): Promise<Record<string, string>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8");

  // Find the End Of Central Directory record by scanning backwards (the trailing
  // comment can be up to 64KB, so bound the search there).
  let eocd = -1;
  const minEocd = 22;
  const scanFrom = Math.max(0, buffer.byteLength - (minEocd + 0xffff));
  for (let i = buffer.byteLength - minEocd; i >= scanFrom; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("That doesn't look like a valid .zip file.");

  const entryCount = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true); // central directory offset

  const out: Record<string, string> = {};

  for (let e = 0; e < entryCount; e++) {
    if (ptr + 46 > buffer.byteLength || view.getUint32(ptr, true) !== CDH_SIG) break;

    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    ptr += 46 + nameLen + extraLen + commentLen;

    if (!wanted(zipBaseName(name))) continue;

    // Jump to the local header to find where the file data actually starts.
    if (view.getUint32(localOffset, true) !== LFH_SIG) continue;
    const lfhNameLen = view.getUint16(localOffset + 26, true);
    const lfhExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lfhNameLen + lfhExtraLen;
    const raw = bytes.subarray(dataStart, dataStart + compSize);

    try {
      const content = method === 0 ? raw : await inflateRaw(raw);
      out[zipBaseName(name)] = decoder.decode(content);
    } catch {
      // Skip an entry we can't decompress rather than failing the whole import.
    }
  }

  return out;
}
