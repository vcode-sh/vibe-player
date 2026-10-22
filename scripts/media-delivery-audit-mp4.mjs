function readBoxType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset + 4] ?? 0,
    bytes[offset + 5] ?? 0,
    bytes[offset + 6] ?? 0,
    bytes[offset + 7] ?? 0
  );
}

function readBoxSize(bytes, offset) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(offset);
  if (size !== 1) {
    return { headerSize: 8, size };
  }
  if (offset + 16 > bytes.length) {
    return null;
  }
  return { headerSize: 16, size: Number(view.getBigUint64(offset + 8)) };
}

function collectMp4Boxes(bytes) {
  const boxes = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const boxSize = readBoxSize(bytes, offset);
    if (!boxSize || boxSize.size < boxSize.headerSize) {
      break;
    }
    const type = readBoxType(bytes, offset);
    const truncated = offset + boxSize.size > bytes.length;
    boxes.push({ offset, size: boxSize.size, truncated, type });
    if (truncated || boxSize.size === 0) {
      break;
    }
    offset += boxSize.size;
  }
  return boxes;
}

function findAscii(bytes, text) {
  const needle = [...text].map((char) => char.charCodeAt(0));
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    let matched = true;
    for (let part = 0; part < needle.length; part += 1) {
      if (bytes[index + part] !== needle[part]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
}

export function inspectMediaDeliveryMp4(firstBytes, tailBytes, tailStart) {
  const boxes = collectMp4Boxes(firstBytes);
  const moovBox = boxes.find((box) => box.type === "moov");
  const mdatBox = boxes.find((box) => box.type === "mdat");
  const tailMoovIndex = findAscii(tailBytes, "moov");
  const tailMoovOffset =
    tailMoovIndex >= 4 ? tailStart + tailMoovIndex - 4 : null;
  const isMp4 = boxes.some((box) => box.type === "ftyp");
  const faststart = Boolean(
    moovBox && (!mdatBox || moovBox.offset < mdatBox.offset)
  );
  return { boxes, faststart, isMp4, mdatBox, moovBox, tailMoovOffset };
}
