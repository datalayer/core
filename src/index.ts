import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { MainAreaWidget, ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import icon from '@datalayer/icons-react/data1/DatalayerGreenIconLabIcon';
import { requestAPI } from './handler';
import { DatalayerWidget } from './widget';

import '../style/index.css';

/**
 * The command IDs used by the plugin.
 */
namespace CommandIDs {
  export const create = 'create-datalayer-widget';
}

/**
 * Initialization data for the @datalayer/core extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@datalayer/core:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ISettingRegistry, ILauncher],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null,
    launcher: ILauncher
  ) => {
    const { commands } = app;
    const command = CommandIDs.create;
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
      }
    });
    const category = 'Datalayer';
    palette.addItem({ command, category });
    if (launcher) {
      launcher.add({
        command,
        category,
        rank: 1
      });
    }
    console.log('JupyterLab extension @datalayer/core is activated!');
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('@datalayer/core settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for @datalayer/core.', reason);
        });
    }
    requestAPI<any>('get_config')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The Jupyter Server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
