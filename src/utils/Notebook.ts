/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { JupyterLab } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';

/**
 * Create a notebook
 *
 * @param app JupyterLab application
 * @param name Notebook name
 * @param url Notebook content URL
 */
export const createNotebook = async ({
  app,
  name,
  url,
  options
}: {
  app: JupyterLab;
  name?: string;
  url?: string;
  options?: { cwd?: string; kernelId?: string; kernelName?: string };
}): Promise<void> => {
  const notebook: NotebookPanel = await app.commands.execute(
    'notebook:create-new',
    options,
  );
  /*
  if (name) {
    notebook.context.rename(name + '.ipynb');
  }
  */
  if (url) {
    const nbmodel = await fetch(url);
    const nbmodelText = await nbmodel.text();
    const text = nbmodelText.replaceAll('\n', `
`);
    notebook.context.model.fromJSON({
      ...JSON.parse(text)
    });
  }
};

export const createNotebookVariant = async (
  app: JupyterLab,
  name: string,
  url: string
) => {
  const notebook: NotebookPanel = await app.commands.execute(
    'notebook:create-new',
    { cwd: '/' }
  );
  notebook.context.rename(name + '.ipynb');
  const nbmodel = await fetch(url);
  const text = (await nbmodel.text()).replaceAll('\\n', '');
  notebook.context.model.fromJSON({
    ...JSON.parse(text)
  });
};
