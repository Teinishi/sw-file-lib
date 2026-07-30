import type { DeepReadonly } from "ts-essentials";

export class BinaryWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset = 0;
  private textEncoder: TextEncoder;

  constructor(size = 1024) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
    this.textEncoder = new TextEncoder();
  }

  getPos() {
    return this.offset;
  }

  setPos(value: number) {
    this.offset = value;
  }

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

  writeU8(v: number) {
    this.ensure(1);
    this.view.setUint8(this.offset, v);
    this.offset++;
  }

  writeU16(v: number, littleEndian = true) {
    this.ensure(2);
    this.view.setUint16(this.offset, v, littleEndian);
    this.offset += 2;
  }

  writeU32(v: number, littleEndian = true) {
    this.ensure(4);
    this.view.setUint32(this.offset, v, littleEndian);
    this.offset += 4;
  }

  writeF32(v: number, littleEndian = true) {
    this.ensure(4);
    this.view.setFloat32(this.offset, v, littleEndian);
    this.offset += 4;
  }

  writeAscii(text: string, endNull?: boolean) {
    this.ensure(text.length);
    for (let i = 0; i < text.length; i++) {
      this.view.setUint8(this.offset++, text.charCodeAt(i) & 0x7f);
    }

    if (endNull) {
      this.writeU8(0);
    }
  }

  writeUtf8(text: string, endNull?: boolean) {
    const bytes = this.textEncoder.encode(text);
    this.writeBytes(bytes);

    if (endNull) {
      this.writeU8(0);
    }
  }

  writeBytes(data: DeepReadonly<Uint8Array>) {
    this.ensure(data.length);
    new Uint8Array(this.buffer, this.offset, data.length).set(data);
    this.offset += data.length;
  }

  toUint8Array() {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}
