const FRAME_PREFIX = "CC";
const EPC_PC_WORD = "3000";
const EPC_HEX_LENGTH = 24;
const MIN_FRAME_SEARCH_LENGTH = 60;
const MAX_BUFFER_LENGTH = 2000;
const HEX_PATTERN = /^[0-9A-F]+$/;

export type RfidParseResult = {
  buffer: string;
  epcs: string[];
};

export function appendAndParseYanzeoEpcs(
  currentBuffer: string,
  chunk: Buffer,
): RfidParseResult {
  return parseYanzeoEpcs(
    `${currentBuffer}${chunk.toString("hex").toUpperCase()}`,
  );
}

export function parseYanzeoEpcs(rawBuffer: string): RfidParseResult {
  let buffer = rawBuffer.toUpperCase();
  const epcs: string[] = [];

  while (true) {
    const startIndex = buffer.indexOf(FRAME_PREFIX);

    if (startIndex === -1) {
      break;
    }

    if (startIndex > 0) {
      buffer = buffer.slice(startIndex);
      continue;
    }

    const pcIndex = buffer.indexOf(EPC_PC_WORD);
    const epcStart = pcIndex + EPC_PC_WORD.length;
    const epcEnd = epcStart + EPC_HEX_LENGTH;

    if (pcIndex !== -1 && buffer.length >= epcEnd) {
      const epc = buffer.slice(epcStart, epcEnd);

      if (HEX_PATTERN.test(epc)) {
        epcs.push(epc);
      }

      buffer = buffer.slice(epcEnd);
      continue;
    }

    if (pcIndex === -1 && buffer.length > MIN_FRAME_SEARCH_LENGTH) {
      buffer = buffer.slice(FRAME_PREFIX.length);
      continue;
    }

    break;
  }

  if (buffer.length > MAX_BUFFER_LENGTH) {
    buffer = "";
  }

  return { buffer, epcs };
}
