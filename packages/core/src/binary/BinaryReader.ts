/** Binary input accepted by the binary parser. */
export type BinaryReaderInput = ArrayBuffer | ArrayBufferView | Uint8Array;

export function toUint8Array(input: ArrayBuffer | ArrayBufferView | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  input satisfies never;
  throw new TypeError("Unsupported input type for binary reader.");
}

export class BinaryReader {
  private view!: DataView;
  private offset = 0;
  private textDecoder: TextDecoder;

  constructor(input: BinaryReaderInput) {
    const bytes = toUint8Array(input);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.offset = 0;
    this.textDecoder = new TextDecoder();
  }

  readU8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset++;
    return value;
  }

  readU16(littleEndian = true): number {
    const value = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return value;
  }

  readU32(littleEndian = true): number {
    const value = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  readF32(littleEndian = true): number {
    const value = this.view.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(this.readU8());
    }
    return new Uint8Array(bytes);
  }

  readAscii(length: number): string {
    let text = "";
    for (let i = 0; i < length; i++) {
      text += String.fromCharCode(this.readU8());
    }
    return text;
  }

  readUtf8(length: number): string {
    return this.textDecoder.decode(this.readBytes(length));
  }
}
