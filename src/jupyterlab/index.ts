import { JupyterFrontEnd, JupyterFrontEndPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { MainAreaWidget, ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ILauncher } from '@jupyterlab/launcher';
import icon from '@datalayer/icons-react/data1/DatalayerGreenPaddingIconLabIcon';
import { requestAPI } from './handler';
import { DatalayerWidget } from './widget';

import '../../style/index.css';

/**
 * The command IDs used by the plugin.
 */
namespace CommandIDs {
  export const create = 'datalayer:create-datalayer-widget';
}

export const PLUGIN_ID = '@datalayer/core:plugin';

let tracker: WidgetTracker<MainAreaWidget<DatalayerWidget>>;

/**
 * Initialization data for the @datalayer/core extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ISettingRegistry, ILauncher, ILayoutRestorer],
  deactivate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settingRegistry?: ISettingRegistry,
    launcher?: ILauncher,
    restorer?: ILayoutRestorer,
  ) => {
    tracker.forEach(widget => widget.dispose());
    console.log(`${PLUGIN_ID} is deactivated`);
  },
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settingRegistry?: ISettingRegistry,
    launcher?: ILauncher,
    restorer?: ILayoutRestorer,
  ) => {
    const { commands } = app;
    const command = CommandIDs.create;
    if (!tracker) {
      tracker = new WidgetTracker<MainAreaWidget<DatalayerWidget>>({
        namespace: 'datalayer',
      });
    }
    if (restorer) {
      void restorer.restore(tracker, {
        command,
        name: () => 'datalayer',
      });
    }
    commands.addCommand(command, {
      caption: 'Show Datalayer',
      label: 'Datalayer',
      icon,
      execute: () => {
        const content = new DatalayerWidget(app);
        const widget = new MainAreaWidget<DatalayerWidget>({ content });
        widget.title.label = 'Datalayer';
        widget.title.icon = icon;
        app.shell.add(widget, 'main');
        tracker.add(widget);
      }
    });
    const category = 'Datalayer';
    palette.addItem({ command, category });
    if (launcher) {
      launcher.add({
        command,
        category,
        rank: 1.1,
      });
    }
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log(`${PLUGIN_ID} settings loaded:`, settings.composite);
        })
        .catch(reason => {
          console.error(`Failed to load settings for ${PLUGIN_ID}`, reason);
        });
    }
    requestAPI<any>('config')
      .then(data => {
        console.log('Received config', data);
      })
      .catch(reason => {
        console.error(
          `Error while accessing the jupyter server extension.\n${reason}`
        );
      }
    );
    console.log(`JupyterLab plugin ${PLUGIN_ID} is activated.`);
  }
};

export default plugin;
