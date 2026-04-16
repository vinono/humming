import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

type PackageJson = {
  repository?: {
    type?: string;
    url?: string;
  };
};

const rootDir = process.cwd();
const outDir = path.join(rootDir, '.pages');

async function main() {
  await rm(outDir, { force: true, recursive: true });
  await mkdir(path.join(outDir, 'docs'), { recursive: true });

  const repoUrl = await readRepositoryUrl();

  await cp(path.join(rootDir, 'assets'), path.join(outDir, 'assets'), {
    recursive: true,
  });
  await cp(path.join(rootDir, 'site'), path.join(outDir, 'site'), {
    recursive: true,
  });

  const rootHtml = await readFile(path.join(rootDir, 'index.html'), 'utf8');
  const docsHtml = await readFile(path.join(rootDir, 'docs', 'index.html'), 'utf8');

  const builtRootHtml = rewriteMarkdownLinks(rootHtml, 'index.html', repoUrl);
  const builtDocsHtml = rewriteMarkdownLinks(
    docsHtml,
    'docs/index.html',
    repoUrl,
  );

  await writeFile(path.join(outDir, 'index.html'), builtRootHtml);
  await writeFile(path.join(outDir, '404.html'), builtRootHtml);
  await writeFile(path.join(outDir, 'docs', 'index.html'), builtDocsHtml);
  await writeFile(path.join(outDir, '.nojekyll'), '');
}

async function readRepositoryUrl(): Promise<string> {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, 'utf8'),
  ) as PackageJson;
  const repositoryUrl = packageJson.repository?.url;

  if (!repositoryUrl) {
    throw new Error('package.json repository.url is required for Pages links');
  }

  return repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '');
}

function rewriteMarkdownLinks(
  html: string,
  sourceRelativePath: string,
  repoUrl: string,
): string {
  const sourceDir = toPosix(path.posix.dirname(sourceRelativePath));

  return html.replace(/href="([^"]+\.md)"/g, (_match, href: string) => {
    if (isExternalHref(href)) {
      return `href="${href}"`;
    }

    const resolvedPath = path.posix.normalize(
      path.posix.join(sourceDir === '.' ? '' : sourceDir, href),
    );
    const githubPath = resolvedPath.replace(/^\.\//, '');

    return `href="${repoUrl}/blob/main/${githubPath}"`;
  });
}

function isExternalHref(href: string): boolean {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('#') ||
    href.startsWith('mailto:')
  );
}

function toPosix(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

await main();
