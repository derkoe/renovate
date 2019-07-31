import { logger } from '../../logger';
import { api } from './gerrit-got-wrapper';

const defaults: any = {
  hostType: 'gerrit',
};

export async function initPlatform({
  endpoint,
  username,
  password,
}: {
  endpoint: string;
  username: string;
  password: string;
}) {
  if (!endpoint) {
    throw new Error('Init: You must configure a Gerrit endpoint');
  }
  if (!(username && password)) {
    throw new Error(
      'Init: You must configure a Gerrit username/password (HTTP password)'
    );
  }

  const res = {
    endpoint: endpoint.replace(/\/?$/, '/'), // always add a trailing slash
  };
  api.setBaseUrl(res.endpoint);
  defaults.endpoint = res.endpoint;
  return res;
}

// Get all repositories that the user has access to
export async function getRepos() {
  logger.info('Autodiscovering GitLab repositories');
  try {
    const url = `projects/?d`;
    const res = await api.get(url);
    const projectKeys = Object.keys(res.body);
    logger.info(`Discovered ${projectKeys.length} project(s)`);
    return projectKeys.map(key => res.body[key]);
    // return res.body.map(
    //   (repo: { path_with_namespace: string }) => repo.path_with_namespace
    // );
  } catch (err) {
    logger.error({ err }, `GitLab getRepos error`);
    throw err;
  }
}
