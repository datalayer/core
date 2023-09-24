import { JupyterFrontEnd } from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import Datalayer from '../Datalayer';

export class DatalayerWidget extends ReactWidget {
  private _app: JupyterFrontEnd;
  constructor(app: JupyterFrontEnd) {
    super();
    this._app = app;
    this.addClass('dla-Container');
  }

  render(): JSX.Element {
    return <Datalayer app={this._app} />;
  }
}
