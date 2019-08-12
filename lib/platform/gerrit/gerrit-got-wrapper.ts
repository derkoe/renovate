import URL from 'url';
import { GotJSONOptions } from 'got';
import * as got from 'got';
import { GotApi, GotApiOptions } from '../common';

let gerritGot = require('../../util/got');

interface GerritGotApi extends GotApi {
  initDigest(wwwAuthenticate: string);
}

const AUTH_KEY_VALUE_RE = /(\w+)=["']?([^'"]+)["']?/;
let baseUrl: string;

async function get(path: string, options: GotApiOptions & GotJSONOptions) {
  const url = URL.resolve(baseUrl, path);
  const opts: GotApiOptions & GotJSONOptions = {
    json: false,
    hostType: 'gerrit',
    ...options,
  };
  const res = await gerritGot(url, opts);
  res.body = JSON.parse(res.body.substring(4)); // Gerrit adds )]}' to all responses
  return res;
}

const helpers = ['get', 'post', 'put', 'patch', 'head', 'delete'];

export const api: GerritGotApi = {} as any;

for (const x of helpers) {
  (api as any)[x] = (url: string, opts: any) =>
    get(url, Object.assign({}, opts, { method: x.toUpperCase() }));
}

api.setBaseUrl = (e: string) => {
  baseUrl = e;
};

api.initDigest = wwwAuthenticate => {
  const digestParts = wwwAuthenticate.substring(7).split(/\,\s+/);
  var digest = {};
  digestParts.forEach(part => {
    const match = part.match(AUTH_KEY_VALUE_RE);
    if (match) {
      digest[match[1]] = match[2].replace(/["']/g, '');
    }
  });

  gerritGot = got.mergeInstances(
    got.create({ options: { digest } }),
    gerritGot
  );
};

export default api;
