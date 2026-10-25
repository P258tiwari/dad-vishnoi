// Accept only known media signatures, never active SVG/HTML or executable uploads.
// This is format validation, not a malware scanner.
export async function isSupportedUpload(file: File) {
  const type = file.type.split(";")[0].toLowerCase();
  const bytes = Buffer.from(await file.slice(0, 64).arrayBuffer());
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const text = (start: number, end: number) => bytes.toString("ascii", start, end);
  if (type === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (type === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(text(0, 6));
  if (type === "image/webp") return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (type === "application/pdf") return text(0, 5) === "%PDF-";
  if (["audio/webm", "video/webm"].includes(type)) return starts(0x1a, 0x45, 0xdf, 0xa3);
  if (["audio/ogg", "video/ogg", "application/ogg"].includes(type)) return text(0, 4) === "OggS";
  if (["audio/wav", "audio/x-wav"].includes(type)) return text(0, 4) === "RIFF" && text(8, 12) === "WAVE";
  if (type === "audio/mpeg") return text(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (["audio/mp4", "audio/x-m4a", "video/mp4", "video/quicktime", "image/heic", "image/heif"].includes(type)) return text(4, 8) === "ftyp";
  return false;
}
