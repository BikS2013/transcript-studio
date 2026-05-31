export interface DropFileLike {
  name: string;
}

export interface ClassifiedDroppedFiles<T extends DropFileLike> {
  accepted: T[];
  rejected: T[];
}

export function classifyDroppedM4aFiles<T extends DropFileLike>(files: Iterable<T>): ClassifiedDroppedFiles<T> {
  const accepted: T[] = [];
  const rejected: T[] = [];
  for (const file of files) {
    if (isM4aFileName(file.name)) {
      accepted.push(file);
    } else {
      rejected.push(file);
    }
  }
  return { accepted, rejected };
}

export function isM4aFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".m4a");
}
