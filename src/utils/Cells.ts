/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IDataset } from "../models";

export const getDatasetCell = (dataset: IDataset) => {
  switch(dataset.contentType) {
    case 'application/vnd.ms-excel':
    case 'text/csv':
      return `# --- ✅ Load the ${dataset.fileName}.${dataset.datasetExtension} dataset (${dataset.mimeType})
import pandas as pd
${dataset.fileName}_${dataset.datasetExtension} = pd.read_csv("${dataset.cdnUrl}")
${dataset.fileName}_${dataset.datasetExtension}

`;
    case 'image/png':
    case 'image/jpg':
    case 'image/jpeg':
      return `# --- ✅ Display the ${dataset.fileName}.${dataset.datasetExtension} dataset (${dataset.mimeType})
from IPython.display import Image
url = "${dataset.cdnUrl}"
Image(url, width=300)

`;
    default:
      return `# --- 😞 File of type ${dataset.contentType} is not supported for now.
`;
  }

}
