export type ImportSource = "txt" | "md" | "epub" | "pdf";

export type ImportedDocument = {
  title: string;
  text: string;
  source: ImportSource;
};

export type ImportProgress = {
  done: number;
  total: number;
  unit: "page" | "chapter";
};

export type ImportErrorKind =
  "unsupported" | "drm" | "damaged" | "password" | "no-text";

export class ImportError extends Error {
  readonly kind: ImportErrorKind;

  constructor(kind: ImportErrorKind, message?: string) {
    super(message);
    this.name = "ImportError";
    this.kind = kind;
  }
}
