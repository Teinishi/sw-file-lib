/**
 * Accepted input types for {@link BinaryReader}.
 *
 * The input is read without modification. If an `ArrayBufferView`
 * is provided, its byte offset and length are respected.
 */
export type BinaryReaderInput = ArrayBuffer | ArrayBufferView | Uint8Array;

function toUint8Array(input: ArrayBuffer | ArrayBufferView | Uint8Array): Uint8Array {
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

/**
 * Sequential reader for binary data.
 *
 * Supports reading primitive values, byte arrays, and ASCII/UTF-8 strings
 * from an in-memory buffer. The read position advances automatically after
 * each operation.
 */
export class BinaryReader {
  private view!: DataView;
  private offset = 0;
  private textDecoder: TextDecoder;

  /**
   * Creates a reader from binary data.
   * @param input - Source buffer to read from.
   */
  constructor(input: BinaryReaderInput) {
    const bytes = toUint8Array(input);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.offset = 0;
    this.textDecoder = new TextDecoder();
  }

  /**
   * Reads an unsigned 8-bit integer.
   *
   * @returns The next byte as a number in the range `0–255`.
   * @throws {RangeError} If there is not enough data remaining to read the value.
   */
  readU8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset++;
    return value;
  }

  /**
   * Reads an unsigned 16-bit integer.
   *
   * @param littleEndian - Whether the value is encoded in little-endian format.
   * Defaults to `true`.
   * @returns The decoded integer.
   * @throws {RangeError} If there is not enough data remaining to read the value.
   */
  readU16(littleEndian = true): number {
    const value = this.view.getUint16(this.offset, littleEndian);
    this.offset += 2;
    return value;
  }

  /**
   * Reads an unsigned 32-bit integer.
   *
   * @param littleEndian - Whether the value is encoded in little-endian format.
   * Defaults to `true`.
   * @returns The decoded integer.
   * @throws {RangeError} If there is not enough data remaining to read the value.
   */
  readU32(littleEndian = true): number {
    const value = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  /**
   * Reads a 32-bit IEEE 754 floating-point value.
   *
   * @param littleEndian - Whether the value is encoded in little-endian format.
   * Defaults to `true`.
   * @returns The decoded floating-point number.
   * @throws {RangeError} If there is not enough data remaining to read the value.
   */
  readF32(littleEndian = true): number {
    const value = this.view.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  /**
   * Reads a fixed number of bytes.
   *
   * @param length - Number of bytes to read.
   * @returns A new `Uint8Array` containing the copied bytes.
   * @throws {RangeError} If there is not enough data remaining to read the value.
   */
  readBytes(length: number): Uint8Array {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(this.readU8());
    }
    return new Uint8Array(bytes);
  }

  /**
   * Reads bytes until a null terminator (`0x00`) is encountered.
   *
   * The returned array does **not** include the terminating null byte.
   * The reader position is advanced past the terminator.
   *
   * @returns The bytes before the null terminator.
   * @throws {RangeError} If there is no null terminator until the end of the buffer.
   */
  readBytesUntilZero(): Uint8Array {
    const bytes = [];
    while (true) {
      const byte = this.readU8();
      if (byte === 0) break;
      bytes.push(byte);
    }
    return new Uint8Array(bytes);
  }

  /**
   * Reads a string by converting each byte with `String.fromCharCode()`.
   *
   * If `length` is omitted, bytes are read until a null terminator (`0x00`)
   * is encountered. Otherwise, exactly `length` bytes are read.
   *
   * @param length - Fixed byte length to read.
   * @returns The decoded ASCII string.
   * @throws {RangeError} If the requested bytes exceed the remaining input, or if a null terminator is not found when `length` is omitted.
   */
  readAscii(length?: number): string {
    let text = "";
    if (length !== undefined) {
      for (let i = 0; i < length; i++) {
        text += String.fromCharCode(this.readU8());
      }
    } else {
      while (true) {
        const byte = this.readU8();
        if (byte === 0) break;
        text += String.fromCharCode(byte);
      }
    }
    return text;
  }

  /**
   * Reads a UTF-8 string.
   *
   * If `length` is omitted, bytes are read until a null terminator (`0x00`)
   * is encountered. Otherwise, exactly `length` bytes are read.
   *
   * @param length - Fixed byte length to read.
   * @returns The decoded UTF-8 string.
   * @throws {RangeError} If the requested bytes exceed the remaining input, or if a null terminator is not found when `length` is omitted.
   */
  readUtf8(length?: number): string {
    return this.textDecoder.decode(
      length !== undefined ? this.readBytes(length) : this.readBytesUntilZero(),
    );
  }
}
