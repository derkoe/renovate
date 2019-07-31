import URL from 'url';
import { GotJSONOptions } from 'got';
import got from '../../util/got';
import { GotApi, GotApiOptions } from '../common';

let baseUrl: string;

async function get(path: string, options: GotApiOptions & GotJSONOptions) {
  const url = URL.resolve(baseUrl, path);
  const opts: GotApiOptions & GotJSONOptions = {
    json: false,
    hostType: 'gerrit',
    ...options,
  };
  const res = await got(url, opts);
  res.body = JSON.parse(res.body.substring(4)); // Gerrit adds )]}' to all responses
  return res;
}

const helpers = ['get', 'post', 'put', 'patch', 'head', 'delete'];

export const api: GotApi = {} as any;

for (const x of helpers) {
  (api as any)[x] = (url: string, opts: any) =>
    get(url, Object.assign({}, opts, { method: x.toUpperCase() }));
}

api.setBaseUrl = (e: string) => {
  baseUrl = e;
};

export default api;
