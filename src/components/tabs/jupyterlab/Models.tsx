import { useState, useEffect } from 'react';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Label, Text } from '@primer/react';
import { Table, DataTable } from '@primer/react/drafts';
import { JupyterFrontEndProps } from '../../Datalayer';
import { ISharedDocument } from '@jupyter/ydoc';

class JupyterLabModelFactory implements DocumentRegistry.IModelFactory<any> {
  private _modelFactory: DocumentRegistry.IModelFactory<any> ;
  constructor(modelFactory: DocumentRegistry.IModelFactory<any>) {
    this._modelFactory = modelFactory;
  }
  get id() { return this._modelFactory.name}
  get name() { return this._modelFactory.name}
  get contentType() {return this._modelFactory.contentType}
  get collaborative() {return this._modelFactory.collaborative}
  get isDisposed() {return this._modelFactory.isDisposed};
  get fileFormat() {return this._modelFactory.fileFormat};
  createNew(options?: DocumentRegistry.IModelOptions<ISharedDocument> | undefined) {
    throw new Error('Method not implemented.');
  }
  preferredLanguage(path: string): string {
    throw new Error('Method not implemented.');
  }
  dispose(): void {
    throw new Error('Method not implemented.');
  }
}

const Models = (props: JupyterFrontEndProps) => {
  const { app } = props;
  const [modelFactories, setModelFactories] = useState<JupyterLabModelFactory[]>();
  useEffect(() => {
    if (app) {
      const modelFactories = Array.from(app?.docRegistry.modelFactories());
      const jupyterlabFileTypes = modelFactories.map(modelFactory => new JupyterLabModelFactory(modelFactory));
      setModelFactories(jupyterlabFileTypes);    
    }
  }, [app]);
  return (
    <>
      { modelFactories &&
        <Table.Container>
          <Table.Title as="h2" id="repositories">
            Model Factories
          </Table.Title>
          <Table.Subtitle as="p" id="repositories-subtitle">
            List of registered model factories.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="file-types"
            aria-describedby="file-types-subtitle" 
            data={modelFactories}
            columns={[
              {
                header: 'Name',
                field: 'name',
                renderCell: row => <Text>{row.name}</Text>
              },
              {
                header: 'Content Type',
                field: 'contentType',
                renderCell: row => <Label>{row.contentType}</Label>
              },
              {
                header: 'Collaborative',
                field: 'collaborative',
                renderCell: row => <Text>{String(row.collaborative)}</Text>
              },
              {
                header: 'File Format',
                field: 'fileFormat',
                renderCell: row => {
                  return <Label variant="primary">{String(row.fileFormat)}</Label>;
                }
              },
            ]
          }
        />
      </Table.Container>
    }
    </>
  )
}

export default Models;
