/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const currentUri = () => {
  return window.location.protocol + "//" + window.location.host;
}

// https://stackoverflow.com/questions/12168909/blob-from-dataurl
export const dataURItoBlob = (dataURI: any) => {
  // Convert base64 to raw binary data held in a string.
  // Doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this.
  const byteString = atob(dataURI.split(',')[1]);
  // Separate out the mime component.
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  // Write the bytes of the string to an ArrayBuffer.
  const ab = new ArrayBuffer(byteString.length);
  // Create a view into the buffer.
  const ia = new Uint8Array(ab);
  // Set the bytes of the buffer to the correct values.
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  // Write the ArrayBuffer to a blob, and you're done.
  const blob = new Blob([ab], {type: mimeString});
  return blob;
}
