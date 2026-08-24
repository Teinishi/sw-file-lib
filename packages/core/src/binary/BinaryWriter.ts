/**
 * Sequential writer for binary data.
 *
 * The internal buffer grows automatically as needed. Values are written at the
 * current position, which advances after each operation.
 */
export class BinaryWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset = 0;
  private textEncoder: TextEncoder;

  /**
   * Creates a binary writer.
   *
   * @param size - Initial buffer size in bytes. The buffer expands
   * automatically if additional capacity is required. Defaults to `1024`.
   */
  constructor(size = 1024) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
    this.textEncoder = new TextEncoder();
  }

  /**
   * Returns the current write position in bytes.
   *
   * @returns The current byte offset.
   */
  getPos() {
    return this.offset;
  }

  /**
   * Sets the current write position.
   *
   * If the position is moved beyond the end of the written data, the gap is
   * filled with `0x00` when subsequent writes occur.
   *
   * @param value - New byte offset.
   */
  setPos(value: number) {
    this.offset = value;
  }

  /**
   * Writes a length-prefixed block.
   *
   * The byte length of the data written inside `writeContent` is calculated
   * automatically and written immediately before the block using an unsigned
   * integer of the specified size.
   *
   * For example, `sizeBytes = 2` produces:
   *
   * ```text
   * [length: u16][content...]
   * ```
   *
   * @param sizeBytes - Size of the length field in bytes (`1`, `2`, or `4`).
   * @param writeContent - Callback that writes the block contents.
   */
  withSize(sizeBytes: 1 | 2 | 4, writeContent: (writer: BinaryWriter) => void) {
    const startPos = this.offset;
    this.ensure(sizeBytes);
    this.offset += sizeBytes;

    writeContent(this);

    const returnPos = this.offset;
    const size = returnPos - startPos - sizeBytes;

    this.offset = startPos;
    switch (sizeBytes) {
      case 1:
        this.writeU8(size);
        break;
      case 2:
        this.writeU16(size);
        break;
      case 4:
        this.writeU32(size);
        break;
    }

    this.offset = returnPos;
  }

  private ensure(size: number) {
    if (this.offset + size <= this.buffer.byteLength) return;

    let newSize = this.buffer.byteLength;
    while (newSize < this.offset + size) {
      newSize *= 2;
    }

    const newBuffer = new ArrayBuffer(newSize);
    new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));

    this.buffer = newBuffer;
    this.view = new DataView(newBuffer);
  }

  /**
   * Writes an unsigned 8-bit integer.
   *
   * @param v - Value to write.
   */
  writeU8(v: number) {
    this.ensure(1);
    this.view.setUint8(this.offset, v);
    this.offset++;
  }

  /**
   * Writes an unsigned 16-bit integer.
   *
   * @param v - Value to write.
   * @param littleEndian - Whether to encode in little-endian format.
   * Defaults to `true`.
   */
  writeU16(v: number, littleEndian = true) {
    this.ensure(2);
    this.view.setUint16(this.offset, v, littleEndian);
    this.offset += 2;
  }

  /**
   * Writes an unsigned 32-bit integer.
   *
   * @param v - Value to write.
   * @param littleEndian - Whether to encode in little-endian format.
   * Defaults to `true`.
   */
  writeU32(v: number, littleEndian = true) {
    this.ensure(4);
    this.view.setUint32(this.offset, v, littleEndian);
    this.offset += 4;
  }

  /**
   * Writes a 32-bit IEEE 754 floating-point value.
   *
   * @param v - Value to write.
   * @param littleEndian - Whether to encode in little-endian format.
   * Defaults to `true`.
   */
  writeF32(v: number, littleEndian = true) {
    this.ensure(4);
    this.view.setFloat32(this.offset, v, littleEndian);
    this.offset += 4;
  }

  /**
   * Writes an ASCII string.
   *
   * @param text - Text to encode.
   * @param endNull - Whether to append a null terminator (`0x00`).
   * Defaults to `false`.
   */
  writeAscii(text: string, endNull?: boolean) {
    this.ensure(text.length);
    for (let i = 0; i < text.length; i++) {
      this.view.setUint8(this.offset++, text.charCodeAt(i) & 0x7f);
    }

    if (endNull) {
      this.writeU8(0);
    }
  }

  /**
   * Writes a UTF-8 string.
   *
   * @param text - Text to encode.
   * @param endNull - Whether to append a null terminator (`0x00`).
   * Defaults to `false`.
   */
  writeUtf8(text: string, endNull?: boolean) {
    const bytes = this.textEncoder.encode(text);
    this.writeBytes(bytes);

    if (endNull) {
      this.writeU8(0);
    }
  }

  /**
   * Writes raw bytes.
   *
   * @param data - Bytes to append.
   */
  writeBytes(data: Uint8Array) {
    this.ensure(data.length);
    new Uint8Array(this.buffer, this.offset, data.length).set(data);
    this.offset += data.length;
  }

  /**
   * Returns the written data as a compact byte array.
   *
   * The returned array contains only the written region and does not include
   * any unused capacity from the internal buffer.
   *
   * @returns The serialized binary data.
   */
  toUint8Array() {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}
