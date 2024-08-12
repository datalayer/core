import {
    activatorPlugin,
    datalayerCorePlugin,
    jupyterIAMPlugin,
    jupyterKernelsPlugin,
} from '@datalayer/run';

export default [
    activatorPlugin,
    datalayerCorePlugin,
    jupyterIAMPlugin,
    ...jupyterKernelsPlugin,
];
