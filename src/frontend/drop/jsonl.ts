import type { ClassifiedDroppedFiles, DropFileLike } from "./m4a";

export function classifyDroppedJsonlFiles<T extends DropFileLike>(files: Iterable<T>): ClassifiedDroppedFiles<T> {
  const accepted: T[] = [];
  const rejected: T[] = [];
  for (const file of files) {
    if (isJsonlFileName(file.name)) {
      accepted.push(file);
    } else {
      rejected.push(file);
    }
  }
  return { accepted, rejected };
}

export function isJsonlFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".jsonl");
}
