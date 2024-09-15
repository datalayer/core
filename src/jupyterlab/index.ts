import {
  activatorPlugin,
  datalayerCorePlugin,
  jupyterIAMPlugin,
  jupyterKernelsPlugin,
} from '@datalayer/ui';

export default [
  activatorPlugin,
  datalayerCorePlugin,
  jupyterIAMPlugin,
  ...jupyterKernelsPlugin,
];
