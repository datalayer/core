/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @param data 
 * @param filename 
 * @param mime See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 * @param bom A byte order mark (BOM) is a sequence of bytes used to indicate Unicode encoding of a text file. The underlying character code, U+FEFF , takes one of the following forms depending on the character encoding.
 * 
 * .zip	ZIP archive	application/zip
 */
export const downloadFile = (data: any, filename: string, mime?, bom?) => {

    const blobData = (typeof bom !== 'undefined') ? [bom, data] : [data]
    const blob = new Blob(blobData, {type: mime || 'application/octet-stream'});
    const blobURL = (window.URL && window.URL.createObjectURL) ? window.URL.createObjectURL(blob) : window.webkitURL.createObjectURL(blob);

    const tempLink = document.createElement('a');
    tempLink.style.display = 'none';
    tempLink.href = blobURL;
    tempLink.setAttribute('download', filename);

    // Safari thinks _blank anchor are pop ups. We only want to set _blank
    // target if the browser does not support the HTML5 download attribute.
    // This allows you to download files in desktop safari if pop up blocking
    // is enabled.
    if (typeof tempLink.download === 'undefined') {
        tempLink.setAttribute('target', '_blank');
    }

    document.body.appendChild(tempLink);
    tempLink.click();

    // Fixes "webkit blob resource error 1"
    setTimeout(function() {
        document.body.removeChild(tempLink);
        window.URL.revokeObjectURL(blobURL);
    }, 200)

}

export default downloadFile;
