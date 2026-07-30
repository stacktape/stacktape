declare module 'streamsink' {
  import { Writable, type WritableOptions } from 'node:stream';

  class StreamSink extends Writable {
    constructor(options?: WritableOptions);

    toBuffer(): Buffer;
  }

  export = StreamSink;
}
