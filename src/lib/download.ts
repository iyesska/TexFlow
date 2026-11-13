/** Saves data as a file on the user's device. Browser only. */
export function downloadFile(fileName: string, data: BlobPart, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Saves text as a UTF-8 file on the user's device. Browser only. */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  downloadFile(fileName, content, `${mimeType};charset=utf-8`);
}
