import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import {
  MainAreaWidget,
  ICommandPalette,
  WidgetTracker
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ILauncher } from '@jupyterlab/launcher';
import { PromiseDelegate } from '@lumino/coreutils';
import icon from '@datalayer/icons-react/data1/DatalayerGreenPaddingIconJupyterLab';
import { requestAPI } from './handler';
import { DatalayerWidget } from './widget';
import { datalayerStore } from '../state';
import { IDatalayerConfig, IDatalayer, DatalayerConfiguration } from './tokens';

export * from './tokens';

/**
 * The command IDs used by the plugin.k
 */
namespace CommandIDs {
  export const create = 'datalayer:create-datalayer-widget';
}

let tracker: WidgetTracker<MainAreaWidget<DatalayerWidget>>;

/**
 * Initialization data for the @datalayer/core extension.
 */
const plugin: JupyterFrontEndPlugin<IDatalayer> = {
  id: '@datalayer/core:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ISettingRegistry, ILauncher, ILayoutRestorer],
  provides: IDatalayer,
  deactivate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settingRegistry?: ISettingRegistry,
    launcher?: ILauncher,
    restorer?: ILayoutRestorer
  ) => {
    tracker.forEach(widget => widget.dispose());
    console.log(`${plugin.id} is deactivated`);
  },
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    settingRegistry?: ISettingRegistry,
    launcher?: ILauncher,
    restorer?: ILayoutRestorer
  ): IDatalayer => {
    const ready = new PromiseDelegate<void>();
    const datalayer: IDatalayer = Object.freeze({
      configuration: new DatalayerConfiguration(),
      ready: ready.promise
    });
    storeConfiguration(datalayer.configuration.configuration);
    datalayer.configuration.configurationChanged.connect((_, config) => {
      storeConfiguration(config);
    });

    requestAPI<any>('config')
      .then(data => {
        console.log('Received Datalayer configuration', data);
        datalayerStore.getState().setVersion(data.version);
        const configuration: IDatalayerConfig = {
          apiServerUrl: data.settings.api_server_url,
          launcher: data.settings.launcher,
          whiteLabel: data.settings.white_label
        };
        datalayer.configuration.configuration = configuration;
        ready.resolve();

        // Don't add user interface elements in white label
        if (configuration.whiteLabel) {
          return;
        }

        const { commands } = app;
        const command = CommandIDs.create;
        if (!tracker) {
          tracker = new WidgetTracker<MainAreaWidget<DatalayerWidget>>({
            namespace: 'datalayer'
          });
        }
        if (restorer) {
          void restorer.restore(tracker, {
            command,
            name: () => 'datalayer'
          });
        }
        commands.addCommand(command, {
          caption: 'Show Datalayer Core',
          label: 'Datalayer Core',
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
        const category = configuration.launcher?.category ?? 'Datalayer';
        palette.addItem({ command, category });
        const settingsUpdated = (settings: ISettingRegistry.ISettings) => {
          const showInLauncher = settings.get('showInLauncher')
            .composite as boolean;
          if (launcher && showInLauncher) {
            launcher.add({
              command,
              category,
              rank: 1.1
            });
          }
        };
        if (settingRegistry) {
          settingRegistry
            .load(plugin.id)
            .then(settings => {
              console.log(`${plugin.id} settings loaded:`, settings.composite);
              settingsUpdated(settings);
              settings.changed.connect(settingsUpdated);
            })
            .catch(reason => {
              console.error(`Failed to load settings for ${plugin.id}`, reason);
            });
        }
      })
      .catch(reason => {
        ready.reject(reason);
        console.error(
          `Error while accessing the jupyter server extension.\n${reason}`
        );
      });
    console.log(`JupyterLab plugin ${plugin.id} is activated.`);
    return datalayer;

    function storeConfiguration(configuration?: IDatalayerConfig) {
      const { setConfiguration } = datalayerStore.getState();
      setConfiguration(configuration);
    }
  }
};

export default plugin;
