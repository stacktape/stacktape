import { Transform } from 'node:stream';
import { applyAll } from './misc';

const IGNORE_LINE_MARK = '__IGNORE_LINE_MARK__';

export class StreamTransformer extends Transform {
  lastLineData = '';
  lineTransformers: StdTransformer[] = [];
  putTransformers: StdTransformer[] = [];

  constructor(lineTransformers: StdTransformer[] = [], putTransformers: StdTransformer[] = []) {
    super({ objectMode: true });
    this.lineTransformers = lineTransformers;
    this.putTransformers = putTransformers;
  }

  _transform(chunk: string, _encoding: string, cb: () => any) {
    let data = String(chunk);

    if (this.lastLineData) {
      data = this.lastLineData + data;
    }

    if (this.putTransformers.length) {
      const transformedStd = applyAll(this.putTransformers, data);
      if (transformedStd) {
        this.push(transformedStd);
      }
      cb();
      return;
    }

    const lines = data.split('\n');

    this.lastLineData = lines.splice(lines.length - 1, 1)[0];
    for (const line of lines) {
      const transformedLine = applyAll(this.lineTransformers, line);
      if (transformedLine === null) {
        continue;
      }
      const transformedResult = applyAll(this.lineTransformers, line);
      if (!transformedResult.startsWith(IGNORE_LINE_MARK)) {
        this.push(`${transformedResult}\n`);
      }
    }
    cb();
  }

  _flush(cb: () => any) {
    if (!this.lastLineData) {
      return cb();
    }
    if (this.putTransformers.length) {
      this.push(`${applyAll(this.putTransformers, this.lastLineData)}\n`);
    } else if (this.lineTransformers.length) {
      this.push(`${applyAll(this.lineTransformers, this.lastLineData)}\n`);
    }
    this.lastLineData = '';
    cb();
  }
}
