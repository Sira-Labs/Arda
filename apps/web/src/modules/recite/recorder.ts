/**
 * Recording a recitation in the browser (spec F7): the microphone through MediaRecorder, in
 * the first format the browser offers of Opus in WebM (Chrome, Edge), Opus in Ogg (Firefox)
 * or AAC in MP4 (Safari). Echo cancellation and noise suppression are on: a room, not a
 * studio.
 */

/** A finished take. */
export interface Take {
  blob: Blob;
  /** The format as the api stores it, without codecs (`audio/webm`). */
  mime: string;
  durationMs: number;
}

export type RecorderFailure = 'denied' | 'unsupported' | 'failed';

export class RecorderError extends Error {
  constructor(readonly reason: RecorderFailure) {
    super(`recorder: ${reason}`);
  }
}

/** One take at a time: start, then stop for the take or cancel to drop it. */
export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<Take>;
  cancel(): void;
}

export type RecorderFactory = () => Recorder;

/** The formats asked for, best first. */
const FORMATS = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm',
];

/** The container a recorder's mime type names, as the api accepts it. */
export const baseMime = (type: string): string =>
  type.split(';')[0]!.trim().toLowerCase();

export const browserRecorder: RecorderFactory = () => {
  let media: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;

  const release = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  return {
    async start() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new RecorderError('unsupported');
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : '';
        throw new RecorderError(
          name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed'
        );
      }
      const mimeType = FORMATS.find((type) => MediaRecorder.isTypeSupported(type));
      chunks = [];
      media = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48_000,
      });
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      media.start(1000);
      startedAt = performance.now();
    },

    stop() {
      const recorder = media;
      if (!recorder) return Promise.reject(new RecorderError('failed'));
      return new Promise<Take>((resolve) => {
        recorder.onstop = () => {
          release();
          const type = recorder.mimeType || chunks[0]?.type || 'audio/webm';
          resolve({
            blob: new Blob(chunks, { type }),
            mime: baseMime(type),
            durationMs: performance.now() - startedAt,
          });
          media = null;
        };
        recorder.stop();
      });
    },

    cancel() {
      if (media && media.state !== 'inactive') {
        media.onstop = null;
        media.stop();
      }
      media = null;
      release();
    },
  };
};
