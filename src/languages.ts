import fs from 'fs';
import path from 'path';
import utils from './utils';
import { paths } from './constants';
import plugins from './plugins';

const languagesPath: string = path.join(__dirname, '../build/public/language');

const files: string[] = fs.readdirSync(path.join(paths.nodeModules, '/timeago/locales'));
const timeagoCodes: string[] = files.filter(f => f.startsWith('jquery.timeago')).map(f => f.split('.')[2]);

export async function get(language: string, namespace): Promise<any> {
    const pathToLanguageFile: string = path.join(languagesPath, language, `${namespace}.json`);
    if (!pathToLanguageFile.startsWith(languagesPath)) {
        throw new Error('[[error:invalid-path]]');
    }
    const data: string = await fs.promises.readFile(pathToLanguageFile, 'utf8');
    const parsed = JSON.parse(data) || {};
    const result = await plugins.hooks.fire('filter:languages.get', {
        language,
        namespace,
        data: parsed,
    });
    return result.data;
}

let codeCache = null;
export async function listCodes(): Promise<any> {
    if (codeCache && codeCache.length) {
        return codeCache;
    }
    try {
        const file: string = await fs.promises.readFile(path.join(languagesPath, 'metadata.json'), 'utf8');
        const parsed = JSON.parse(file);

        codeCache = parsed.languages;
        return parsed.languages;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

let listCache = null;
export async function list(): Promise<any> {
    if (listCache && listCache.length) {
        return listCache;
    }

    const codes = await listCodes();

    let languages = await Promise.all(codes.map(async (folder) => {
        try {
            const configPath: string = path.join(languagesPath, folder, 'language.json');
            const file: string = await fs.promises.readFile(configPath, 'utf8');
            const lang = JSON.parse(file);
            return lang;
        } catch (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            throw err;
        }
    }));

    // filter out invalid ones
    languages = languages.filter(lang => lang && lang.code && lang.name && lang.dir);

    listCache = languages;
    return languages;
}

export async function userTimeagoCode(userLang): Promise<any> {
    const languageCodes = await listCodes();
    const timeagoCode: string = utils.userLangToTimeagoCode(userLang) as string;
    if (languageCodes.includes(userLang) && timeagoCodes.includes(timeagoCode)) {
        return timeagoCode;
    }
    return '';
}
