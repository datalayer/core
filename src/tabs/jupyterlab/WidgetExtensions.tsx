import { useState, useEffect } from 'react';
import { Box, Text, Label } from '@primer/react';
import { JupyterFrontEndProps } from '../../Datalayer';

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

type Props = { widgetName: string, extensions: WidgetExtensionWithId[] };

const WidgetExtensionTable = (props: Props) => {
  const { widgetName, extensions } = props;
  return (
    <>
      <Box>
        <Text><Label>{widgetName}</Label></Text>
      </Box>
      { extensions.map(extension => {
          return (
            <>
              <Box>
                {extension.extension.constructor.name}
              </Box>
            </>
          )
        })
      }
    </>
  )
} 

const WidgetExtensions = (props: JupyterFrontEndProps) => {
  const { app } = props;  
  const [widgetExtensions, setWidgetExtensions] = useState<JupyterLabWidgetExtensions>();
  useEffect(() => {
    if (app) {
      const widgetExtensions = (app!.docRegistry as any)._extenders;
      const w = new Map<string, Array<WidgetExtensionWithId>>();
      Object.keys(widgetExtensions).forEach(widgetName => {
        const extensions = widgetExtensions[widgetName];
        const e = extensions!.map((e: any) => new WidgetExtensionWithId(widgetName, e));
        w.set(widgetName, e);
      });
      setWidgetExtensions(w);
    }
  }, [app]);
  return (
    <>
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
