/**
 * What language a directory is written in, from the file that had to be there.
 *
 * Every service fact carries a language, and until now only `package.json` could supply one — so a
 * Django project with a Procfile produced no services at all, and `init` told the user their
 * repository had nothing to deploy. This is the small piece that unblocks the rest.
 *
 * Marker files only. No extension counting, no reading contents: a repository with one `.py` script
 * in it is not a Python service, and a build file is a statement of intent in a way that a stray
 * source file is not.
 */

/**
 * Ordered: the first marker found wins, so a polyglot repository resolves the same way every time.
 *
 * `suffixes` exists for the ecosystems whose project file is named after the project rather than
 * after the tool — `Api.csproj`, `Api.fsproj` — where there is no fixed name to look for.
 */
const MARKERS: ReadonlyArray<{ files?: readonly string[]; suffixes?: readonly string[]; language: string }> = [
  { files: ['package.json'], language: 'javascript' },
  { files: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py', 'manage.py'], language: 'python' },
  { files: ['Gemfile'], language: 'ruby' },
  { files: ['go.mod'], language: 'go' },
  { files: ['Cargo.toml'], language: 'rust' },
  { files: ['composer.json'], language: 'php' },
  { files: ['pom.xml', 'build.gradle', 'build.gradle.kts'], language: 'java' },
  { files: ['mix.exs'], language: 'elixir' },
  { suffixes: ['.csproj', '.fsproj', '.vbproj'], language: 'dotnet' },
  { files: ['Package.swift'], language: 'swift' }
];

/**
 * The language of one directory, given the repository's file list.
 *
 * `directory` is repository-relative POSIX, with `.` meaning the root. Only files directly in that
 * directory count — a marker two levels down belongs to a different service.
 */
export const languageOf = (files: readonly string[], directory: string): string | undefined => {
  const prefix = directory === '.' || directory === '' ? '' : `${directory}/`;
  const inDirectory = new Set(
    files
      .filter((file) => file.startsWith(prefix) && !file.slice(prefix.length).includes('/'))
      .map((file) => file.slice(prefix.length))
  );

  return MARKERS.find(
    (marker) =>
      (marker.files ?? []).some((name) => inDirectory.has(name)) ||
      (marker.suffixes ?? []).some((suffix) => [...inDirectory].some((name) => name.endsWith(suffix)))
  )?.language;
};
