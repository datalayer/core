import { useState, useEffect } from 'react';
import { Label, Text } from '@primer/react';
import { Table, DataTable, PageHeader } from '@primer/react/drafts';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { DatalayerProps } from '../../Datalayer';

class ModelFactory implements Partial<DocumentRegistry.IModelFactory<any>> {
  private _modelFactory: DocumentRegistry.IModelFactory<any> ;
  constructor(modelFactory: DocumentRegistry.IModelFactory<any>) {
    this._modelFactory = modelFactory;
  }
  get id() { return this._modelFactory.name }
  get name() { return this._modelFactory.name }
  get contentType() { return this._modelFactory.contentType }
  get collaborative() { return this._modelFactory.collaborative }
  get isDisposed() { return this._modelFactory.isDisposed }
  get fileFormat() { return this._modelFactory.fileFormat }
}

const Models = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const [modelFactories, setModelFactories] = useState<ModelFactory[]>();
  useEffect(() => {
    if (jupyterFrontend) {
      const modelFactories = Array.from(jupyterFrontend.docRegistry.modelFactories());
      const jupyterlabModelFactories = modelFactories.map(modelFactory => new ModelFactory(modelFactory));
      setModelFactories(jupyterlabModelFactories);    
    }
  }, [jupyterFrontend]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Models</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      { modelFactories &&
        <Table.Container>
          <Table.Title as="h2" id="model-factories">
            Model Factories
          </Table.Title>
          <Table.Subtitle as="p" id="model-factories-subtitle">
            List of registered model factories.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="model-factories"
            aria-describedby="model-factories-subtitle" 
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
                  return <Label variant="primary">{String(row.fileFormat)}</Label>
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
