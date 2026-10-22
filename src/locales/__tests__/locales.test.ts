import enUS from '../enUS.json';
import esES from '../esES.json';
import ptBR from '../ptBR.json';

type Tree = { [key: string]: string | Tree };

function leafPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafPaths(value, path);
  });
}

function leafValue(tree: Tree, path: string): string {
  const value = path.split('.').reduce<string | Tree>((node, key) => (node as Tree)[key], tree);
  return value as string;
}

function placeholders(value: string): string[] {
  return (value.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
}

const USERS_KEYS_SHARED_WITH_ENGLISH = new Set([
  'statStatus',
  'status',
  'subStatus',
  'reportStatus',
  'columnStatus',
  'sms',
  'bioSection',
  'freemium',
  'premium',
]);

describe('admin.users locales', () => {
  const en = enUS.admin.users as Tree;
  const pt = ptBR.admin.users as Tree;
  const es = esES.admin.users as Tree;
  const enPaths = leafPaths(en).sort();

  it('has the same keys in every locale', () => {
    expect(leafPaths(pt).sort()).toEqual(enPaths);
    expect(leafPaths(es).sort()).toEqual(enPaths);
  });

  it('keeps the same interpolation placeholders in every locale', () => {
    for (const path of enPaths) {
      expect([path, placeholders(leafValue(pt, path))]).toEqual([
        path,
        placeholders(leafValue(en, path)),
      ]);
      expect([path, placeholders(leafValue(es, path))]).toEqual([
        path,
        placeholders(leafValue(en, path)),
      ]);
    }
  });

  it('translates every Portuguese value instead of reusing the English text', () => {
    const untranslated = enPaths.filter((path) => {
      const leaf = path.split('.').pop() ?? path;
      return (
        !USERS_KEYS_SHARED_WITH_ENGLISH.has(leaf) && leafValue(pt, path) === leafValue(en, path)
      );
    });
    expect(untranslated).toEqual([]);
  });

  it('renders the English footer in English', () => {
    expect(leafValue(en, 'footerText')).toBe('Showing {{start}}–{{end}} of {{total}} accounts');
  });
});

describe('admin.categoryRequests locales', () => {
  const en = enUS.admin.categoryRequests as Tree;
  const pt = ptBR.admin.categoryRequests as Tree;
  const es = esES.admin.categoryRequests as Tree;
  const enPaths = leafPaths(en).sort();

  it('has the same keys in every locale', () => {
    expect(leafPaths(pt).sort()).toEqual(enPaths);
    expect(leafPaths(es).sort()).toEqual(enPaths);
  });

  it('keeps the same interpolation placeholders in every locale', () => {
    for (const path of enPaths) {
      expect([path, placeholders(leafValue(pt, path))]).toEqual([
        path,
        placeholders(leafValue(en, path)),
      ]);
      expect([path, placeholders(leafValue(es, path))]).toEqual([
        path,
        placeholders(leafValue(en, path)),
      ]);
    }
  });

  it('translates every Portuguese and Spanish value instead of reusing the English text', () => {
    const sharedWithEnglish = new Set(['table.status', 'rejectDialog.counter']);
    const untranslated = enPaths.filter(
      (path) =>
        !sharedWithEnglish.has(path) &&
        (leafValue(pt, path) === leafValue(en, path) ||
          leafValue(es, path) === leafValue(en, path)),
    );
    expect(untranslated).toEqual([]);
  });

  it('has the keys of the reject dialog, conflict toasts, decision fields and list states', () => {
    for (const path of [
      'rejectDialog.title',
      'rejectDialog.description',
      'rejectDialog.reasonLabel',
      'rejectDialog.tooLong',
      'rejectDialog.confirm',
      'toasts.nameExistsTitle',
      'toasts.nameExistsDescription',
      'toasts.alreadyResolvedTitle',
      'toasts.notFoundTitle',
      'toasts.approveFailedTitle',
      'toasts.rejectFailedTitle',
      'drawer.decidedOn',
      'drawer.rejectionReason',
      'emptyTitle',
      'loadError',
      'createModal.treeError',
    ]) {
      expect(enPaths).toContain(path);
    }
  });

  it('no longer has the keys of the hidden "More info" status and the mock-only fields', () => {
    for (const path of [
      'tabMoreInfo',
      'kpiMoreInfo',
      'status.moreInfo',
      'drawer.askForDetails',
      'drawer.parentPath',
      'drawer.account',
      'drawer.communityVotes',
      'drawer.whyTheyNeedIt',
      'drawer.overlapCheck',
      'table.parentPath',
      'table.votes',
      'toasts.detailsRequestedTitle',
      'createModal.namePlaceholder',
    ]) {
      expect(enPaths).not.toContain(path);
    }
  });

  it('has the list states and pagination the screen renders', () => {
    for (const path of [
      'loading',
      'loadError',
      'retry',
      'footerText',
      'pagination',
      'previousPage',
      'nextPage',
      'pageNumber',
    ]) {
      expect(enPaths).toContain(path);
    }
  });
});
