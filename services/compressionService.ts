
export const compressionService = {
  async compress(data: string): Promise<Uint8Array> {
    const stream = new Blob([data]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const response = new Response(compressedStream);
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
  },

  async decompress(data: Uint8Array): Promise<string> {
    const stream = new Blob([data]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressedStream);
    return await response.text();
  }
};
