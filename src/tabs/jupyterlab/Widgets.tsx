import { useState, useEffect } from 'react';
import { Text, LabelGroup, Label } from '@primer/react';
import { Table, DataTable, PageHeader } from '@primer/react/drafts';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { JupyterFrontEndProps } from '../../Datalayer';

class JupyterLabWidgetFactory implements Partial<DocumentRegistry.IWidgetFactory<any, any>> {
  private _widgetFactory: DocumentRegistry.IWidgetFactory<any, any> ;
  constructor(widgetFactory: DocumentRegistry.IWidgetFactory<any, any>) {
    this._widgetFactory = widgetFactory;
  }
  get id() { return this._widgetFactory.name }
  get name() { return this._widgetFactory.name }
  get modelName() { return this._widgetFactory.modelName }
  get label() { return this._widgetFactory.label }
  get fileTypes() { return this._widgetFactory.fileTypes }
  get isDisposed() { return this._widgetFactory.isDisposed }
  get widgetCreated() { return this._widgetFactory.widgetCreated }
}

const Widgets = (props: JupyterFrontEndProps) => {
  const { app } = props;
  const [widgetFactories, setWidgetFactories] = useState<JupyterLabWidgetFactory[]>();
  useEffect(() => {
    if (app) {
      const widgetFactories = Array.from(app?.docRegistry.widgetFactories());
      const jupyterlabFileTypes = widgetFactories.map(widgetFactory => new JupyterLabWidgetFactory(widgetFactory));
      setWidgetFactories(jupyterlabFileTypes);    
    }
  }, [app]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Widgets</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      { widgetFactories &&
        <Table.Container>
          <Table.Title as="h2" id="widget-factories">
            Widget Factories
          </Table.Title>
          <Table.Subtitle as="p" id="widget-factories-subtitle">
            List of registered widgets factories.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="file-types"
            aria-describedby="file-types-subtitle" 
            data={widgetFactories}
            columns={[
              {
                header: 'Name',
                field: 'name',
                renderCell: row => <Text>{row.name}</Text>
              },
              {
                header: 'Label',
                field: 'label',
                renderCell: row => {
                  return <Text>{row.label}</Text>
                }
              },
              {
                header: 'Model Name',
                field: 'modelName',
                renderCell: row => <Label>{row.modelName}</Label>
              },
              {
                header: 'File Types',
                field: 'fileTypes',
                renderCell: row => {
                  return <LabelGroup>{row.fileTypes.map(fileType => <Label variant="primary">{fileType}</Label>)}</LabelGroup>
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

export default Widgets;
