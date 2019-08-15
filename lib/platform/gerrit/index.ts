import { logger } from '../../logger';
import GitStorage from '../git/storage';
import { api } from './gerrit-got-wrapper';

let config: {
  storage: GitStorage;
  repository: string;
  localDir: string;
  defaultBranch: string;
  baseBranch: string;
  email: string;
  changesList: any[];
} = {} as any;

const defaults: {
  hostType: 'gerrit';
  endpoint?: string;
  urlPattern?: string;
} = {
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

  endpoint = endpoint.replace(/\/?$/, '/'); // always add a trailing slash
  api.setBaseUrl(endpoint);

  let res;

  try {
    res = await api.get('a/config/server/version');
    logger.info(
      `Gerrit did not request authentication, got version ${res.body}`
    );
  } catch (response) {
    const wwwAuthenticate = response.headers['www-authenticate'];
    if (response.statusCode == 401 && wwwAuthenticate) {
      api.initDigest(wwwAuthenticate);
    }
  }

  res = await api.get('a/config/server/version', { username, password });
  logger.info(`Successfully connected to Gerrit, got version ${res.body}`);

  res = await api.get('a/accounts/self', { username, password });
  const user = res.body;
  let gitAuthor = `"${res.body.name}" <${res.body.email}>`;

  res = await api.get('a/config/server/info', { username, password });
  const serverInfo = res.body;
  defaults.urlPattern = serverInfo.download.schemes.http.url;
  defaults.endpoint = endpoint;

  return {
    endpoint,
    gitAuthor,
  };
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

function urlEscape(str: string) {
  return str ? str.replace(/\//g, '%2F') : str;
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
    config = {
      repository: urlEscape(repository),
      localDir,
    } as any;
    res = await api.get(`a/projects/${config.repository}`);
    if (res.body.state !== 'ACTIVE') {
      logger.info(
        'Repository is not active - throwing error to abort renovation'
      );
      throw new Error('not active');
    }

    res = await api.get(`a/projects/${config.repository}/HEAD`);
    config.defaultBranch = res.body;
    config.baseBranch = config.defaultBranch;

    config.storage = new GitStorage();
    await config.storage.initRepo({
      ...config,
      url: defaults.urlPattern.replace('${project}', config.repository),
    });
  } catch (err) {
    logger.warn(err);
  }
}
