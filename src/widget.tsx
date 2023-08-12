import { ReactWidget } from '@jupyterlab/apputils';

import Datalayer from './components/Datalayer';

export class CounterWidget extends ReactWidget {
  constructor() {
    super();
    this.addClass('dla-Container');
  }

  render(): JSX.Element {
    return <Datalayer />;
  }
}
