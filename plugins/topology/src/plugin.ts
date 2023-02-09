import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const topologyPlugin = createPlugin({
  id: 'topology',
  routes: {
    root: rootRouteRef,
  },
});

export const TopologyPage = topologyPlugin.provide(
  createRoutableExtension({
    name: 'TopologyPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
