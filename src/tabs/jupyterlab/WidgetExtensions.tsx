import { useState, useEffect } from 'react';
import { Box, Heading, Label } from '@primer/react';
import { PageHeader } from '@primer/react/drafts';
import { DatalayerProps } from '../../Datalayer';

type WidgetExtension = any;

class WidgetExtensionWithId {
  private _widgetName: string;
  private _extension: WidgetExtension;
  constructor(widgetName: string, extension: WidgetExtension) {
    this._widgetName = widgetName;
    this._extension = extension;
  }
  get id() { return this.widgetName }
  get widgetName() { return this._widgetName }
  get extension() { return this._extension }
}

type JupyterLabWidgetExtensions = Map<string, WidgetExtensionWithId[]>;

type Props = {
  widgetName: string,
  extensions: WidgetExtensionWithId[],
};

const WidgetExtensionTable = (props: Props) => {
  const { widgetName, extensions } = props;
  return (
    <>
      <Box>
        <Heading sx={{fontSize: 2, mb: 2}}>{widgetName}</Heading>
      </Box>
      { extensions.map(extension => {
          return (
            <>
              <Box>
                <Label>{extension.extension.constructor.name}</Label>
              </Box>
            </>
          )
        })
      }
    </>
  )
} 

const WidgetExtensions = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const [widgetExtensions, setWidgetExtensions] = useState<JupyterLabWidgetExtensions>();
  useEffect(() => {
    if (jupyterFrontend) {
      const widgetExtensions = (jupyterFrontend.docRegistry as any)._extenders;
      const w = new Map<string, Array<WidgetExtensionWithId>>();
      Object.keys(widgetExtensions).forEach(widgetName => {
        const extensions = widgetExtensions[widgetName];
        const e = extensions!.map((e: any) => new WidgetExtensionWithId(widgetName, e));
        w.set(widgetName, e);
      });
      setWidgetExtensions(w);
    }
  }, [jupyterFrontend]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Widget Extensions</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      { widgetExtensions &&
        Array.from(widgetExtensions.entries()).map(entry => {
          const [widgetName, extensions] = entry;
          return <WidgetExtensionTable widgetName={widgetName} extensions={extensions}/>
        })
      }
    </>
  )
}

export default WidgetExtensions;
