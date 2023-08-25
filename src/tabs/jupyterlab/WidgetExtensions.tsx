import { useState, useEffect } from 'react';
import { Box, Text, Label } from '@primer/react';
import { JupyterFrontEndProps } from '../../Datalayer';

class ExtensionWithId {
  private _widgetName: string;
  private _extension: any;
  constructor(widgetName: string, extension: any) {
    this._widgetName = widgetName;
    this._extension = extension;
  }
  get id() { return this.widgetName }
  get widgetName() { return this._widgetName }
  get extension(): any { return this._extension }
}

type JupyterLabWidgetExtensions = Map<string, ExtensionWithId[]>;

type Props = { widgetName: string, extensions: ExtensionWithId[] };

const WidgetExtensionTable = (props: Props) => {
  const { widgetName, extensions } = props;
  return (
    <>
      <Box>
        <Text><Label>{widgetName}</Label></Text>
      </Box>
      <Box>
        <Text>List of registered widgets extensions for the {widgetName} widget.</Text>
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
      const w = new Map<string, Array<ExtensionWithId>>();
      Object.keys(widgetExtensions).forEach(widgetName => {
        const extensions = widgetExtensions[widgetName];
        const e = extensions!.map((e: any) => new ExtensionWithId(widgetName, e));
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
