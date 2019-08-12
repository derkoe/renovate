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

  try {
    const response = await api.get('a/config/server/version');
  } catch (response) {
    const wwwAuthenticate = response.headers['www-authenticate'];
    if (response.statusCode == 401 && wwwAuthenticate) {
      api.initDigest(wwwAuthenticate);
    }
  }

  defaults.endpoint = res.endpoint;
  return res;
}

// Get all repositories that the user has access to
export async function getRepos() {
  logger.info('Autodiscovering GitLab repositories');
  try {
    const url = `a/projects/?d`;
    const res = await api.get(url);
    const projectKeys = Object.keys(res.body);
    logger.info(`Discovered ${projectKeys.length} project(s)`);

    // TODO filter active

    return projectKeys;
  } catch (err) {
    logger.error({ err }, `GitLab getRepos error`);
    throw err;
  }
}

export function cleanRepo() {
  console.log('cleanRepo', arguments);
}

export async function initRepo({
  repository,
  localDir,
  optimizeForDisabled,
}: {
  repository: string;
  localDir: string;
  optimizeForDisabled: boolean;
}) {
  let res;
  try {
    res = await api.get(`a/projects/${repository}`);
    if (res.body.state !== 'ACTIVE') {
      logger.info(
        'Repository is not active - throwing error to abort renovation'
      );
      throw new Error('not active');
    }
  } catch (err) {
    logger.warn(err);
  }
}
