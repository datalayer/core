import { datalayerCorePlugin } from '@datalayer/ui/lib/plugins/core/plugin';
import { jupyterIAMPlugin } from '@datalayer/ui/lib/plugins/iam/plugin';
import { jupyterKernelsPlugin } from '@datalayer/ui/lib/plugins/kernels/plugin';
import { activatorPlugin } from '@datalayer/ui/lib/plugins/core/activator';

export default [
  datalayerCorePlugin,
  jupyterIAMPlugin,
  ...jupyterKernelsPlugin,
  activatorPlugin,
];
