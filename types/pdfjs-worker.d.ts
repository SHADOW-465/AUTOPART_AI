// pdf.js ships its worker without type declarations; we only need it as an opaque module.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown
}
