/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export function jsonToCSVString(json) {
  const headers = Object.keys(json[0]);
  let csvString = '';
  csvString += headers.join(',') + '\n';
  json.forEach(obj => {
    const rowCells = headers.map(header => {
      const val = obj[header];
      if (typeof val === "number") {
        return val;
      }
      if (typeof val === "string") {
        return val;
      }
      if (val instanceof Date) {
        return (val as Date).toISOString();
      }
      return '';
    });
    const row = rowCells.join(',');
    csvString += row + '\n';
  });
  return csvString;
}

export const downloadJson = (data: any, fileName: string, extension: string) => {
  const jsonData = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const jsonURL = URL.createObjectURL(jsonData);
  const jsonLink = document.createElement('a');
  jsonLink.href = jsonURL;
  jsonLink.download = `${fileName}.${extension}`;
  document.body.appendChild(jsonLink);
  jsonLink.click();
  document.body.removeChild(jsonLink);
};

export const downloadCSV = (data: any, fileName: string) => {
  const csvString = jsonToCSVString(data);
  const csvData = new Blob([csvString], { type: 'text/csv' });
  const csvURL = URL.createObjectURL(csvData);
  const csvLink = document.createElement('a');
  csvLink.href = csvURL;
  csvLink.download = `${fileName}.csv`;
  document.body.appendChild(csvLink);
  csvLink.click();
  document.body.removeChild(csvLink);
};
