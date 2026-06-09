function writeBoxHeader(bytes, offset, size, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(offset, size);
  for (let index = 0; index < type.length; index += 1) {
    bytes[offset + 4 + index] = type.charCodeAt(index);
  }
}

export function createMp4Sample(boxes) {
  const totalSize = boxes.reduce((sum, box) => sum + box.size, 0);
  const bytes = new Uint8Array(totalSize);
  let offset = 0;
  for (const box of boxes) {
    writeBoxHeader(bytes, offset, box.size, box.type);
    offset += box.size;
  }
  return bytes;
}

export function createRangeResponse(
  bytes,
  total,
  allowOrigin,
  allowCredentials
) {
  const headers = new Headers();
  headers.set("content-range", `bytes 0-${bytes.length - 1}/${total}`);
  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
  }
  if (allowCredentials) {
    headers.set("access-control-allow-credentials", allowCredentials);
  }
  return new Response(bytes, { headers, status: 206 });
}

export function getOrigin(init) {
  const headers = init?.headers;
  if (!(headers instanceof Headers)) {
    return null;
  }
  return headers.get("Origin");
}
