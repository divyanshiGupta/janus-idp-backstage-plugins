/*
 * Copyright 2024 The Janus IDP Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  getRootLogger,
  HostDiscovery,
  loadBackendConfig,
} from '@backstage/backend-common';
import { CatalogClient } from '@backstage/catalog-client';

import yn from 'yn';

import { startStandaloneServer } from '../dev';

const port = process.env.PLUGIN_PORT ? Number(process.env.PLUGIN_PORT) : 7007;
const enableCors = yn(process.env.PLUGIN_CORS, { default: false });
const logger = getRootLogger();
const config = await loadBackendConfig({ logger, argv: process.argv });
const catalogApi = new CatalogClient({
  discoveryApi: HostDiscovery.fromConfig(config),
});

console.log('Starting Standalone Server from run.ts');

startStandaloneServer({ port, enableCors, logger, catalogApi }).catch(err => {
  logger.error('Standalone server failed:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('CTRL+C pressed; exiting.');
  process.exit(0);
});
