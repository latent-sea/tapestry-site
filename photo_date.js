// When a photo was taken, from what the camera wrote inside it (its Exif
// DateTimeOriginal, else its DateTime): a JPEG's first bytes in, a day out.
// No browser needed but for reading the file; tested by tests/test_photo_date.mjs.

const DATE_TAKEN = 0x9003;
const DATE_CHANGED = 0x0132;
const EXIF_IFD = 0x8769;

/** The day a JPEG says it was taken ("YYYY-MM-DD"), from its bytes, or null when it doesn't say. */
export function takenOn(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.length < 4 || view.getUint16(0) !== 0xffd8) return null;
  let at = 2;
  while (at + 4 <= data.length) {
    if (data[at] !== 0xff) return null;
    const marker = data[at + 1];
    const length = view.getUint16(at + 2);
    if (marker === 0xda || marker === 0xd9) return null; // the picture itself begins: no Exif before it
    if (marker === 0xe1 && at + 10 <= data.length && String.fromCharCode(...data.subarray(at + 4, at + 8)) === "Exif") {
      return dateIn(view, at + 10, Math.min(data.length, at + 2 + length));
    }
    at += 2 + length;
  }
  return null;
}

/** The date in a TIFF block of Exif, starting at start: the photo's taking, else its last change. */
function dateIn(view, start, end) {
  if (start + 8 > end) return null;
  const little = view.getUint16(start) === 0x4949;
  const u16 = (at) => (at + 2 <= end ? view.getUint16(at, little) : 0);
  const u32 = (at) => (at + 4 <= end ? view.getUint32(at, little) : 0);
  const entries = (ifd) => {
    const found = new Map();
    const count = u16(start + ifd);
    for (let i = 0; i < count && i < 500; i++) {
      const entry = start + ifd + 2 + i * 12;
      if (entry + 12 > end) break;
      found.set(u16(entry), { type: u16(entry + 2), count: u32(entry + 4), value: entry + 8 });
    }
    return found;
  };
  const text = (entry) => {
    if (!entry || entry.type !== 2 || entry.count < 19) return null;
    const at = entry.count > 4 ? start + u32(entry.value) : entry.value;
    if (at + 19 > end) return null;
    return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + at, 19));
  };
  const first = entries(u32(start + 4));
  const exif = first.has(EXIF_IFD) ? entries(u32(first.get(EXIF_IFD).value)) : new Map();
  return dayOf(text(exif.get(DATE_TAKEN))) ?? dayOf(text(first.get(DATE_CHANGED)));
}

/** "YYYY:MM:DD HH:MM:SS" as its day; a camera that never had its clock set says 0000:00:00, which is none. */
function dayOf(said) {
  const day = said?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!day || day[1] === "0000" || Number(day[2]) < 1 || Number(day[2]) > 12 || Number(day[3]) < 1 || Number(day[3]) > 31) return null;
  return `${day[1]}-${day[2]}-${day[3]}`;
}

/** The day a picture file says it was taken, read from its first bytes, or null. */
export async function takenFrom(file) {
  try {
    return takenOn(new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()));
  } catch {
    return null;
  }
}

/** What several photos' days say of when: one day, or from the first to the last; null with none. */
export function spanOfDays(days) {
  const known = [...new Set(days.filter(Boolean))].sort();
  if (!known.length) return null;
  return { starts: known[0], ends: known.length > 1 ? known.at(-1) : null };
}
