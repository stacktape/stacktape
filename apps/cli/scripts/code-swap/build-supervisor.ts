import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GO_BUILDER =
  'golang:1.25.3-bookworm@sha256:4f43b271f9673eb7bd0cb3a49cc17b08d8d6ee110277e26dbacc93c43a5a7793';
export const buildSupervisor = async (outputDirectory: string) => {
  const source = fileURLToPath(new URL('./supervisor', import.meta.url));
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const child = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '--network=none',
      '-e',
      'CGO_ENABLED=0',
      '-e',
      'GOOS=linux',
      '-e',
      'GOARCH=amd64',
      '-v',
      `${source}:/src:ro`,
      '-v',
      `${output}:/out`,
      '-w',
      '/src',
      GO_BUILDER,
      'sh',
      '-c',
      'CGO_ENABLED=1 go test -race ./... && go vet ./... && go build -trimpath -buildvcs=false -ldflags="-s -w -buildid=" -o /out/stacktape-supervisor .'
    ],
    { stdout: 'inherit', stderr: 'inherit' }
  );
  if (await child.exited) throw new Error('Supervisor build/check failed.');
  const binary = resolve(output, 'stacktape-supervisor');
  const sha256 = createHash('sha256')
    .update(await readFile(binary))
    .digest('hex');
  await writeFile(
    `${binary}.spdx.json`,
    JSON.stringify(
      {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: 'Stacktape code-swap supervisor (linux/amd64)',
        documentNamespace: `https://stacktape.com/code-swap/sbom/${sha256}`,
        creationInfo: { creators: ['Tool: Go-1.25.3'], created: new Date().toISOString() },
        packages: [
          {
            SPDXID: 'SPDXRef-Supervisor',
            name: 'stacktape-supervisor',
            versionInfo: sha256,
            downloadLocation: 'NOASSERTION',
            filesAnalyzed: false,
            checksums: [{ algorithm: 'SHA256', checksumValue: sha256 }],
            licenseConcluded: 'NOASSERTION',
            licenseDeclared: 'NOASSERTION',
            copyrightText: 'NOASSERTION'
          },
          {
            SPDXID: 'SPDXRef-Go',
            name: 'Go standard library',
            versionInfo: '1.25.3',
            downloadLocation: 'https://go.dev/dl/go1.25.3.src.tar.gz',
            filesAnalyzed: false,
            licenseConcluded: 'BSD-3-Clause',
            licenseDeclared: 'BSD-3-Clause',
            copyrightText: 'NOASSERTION',
            externalRefs: [
              {
                referenceCategory: 'PACKAGE-MANAGER',
                referenceType: 'purl',
                referenceLocator: 'pkg:golang/stdlib@1.25.3'
              }
            ]
          }
        ],
        relationships: [
          {
            spdxElementId: 'SPDXRef-DOCUMENT',
            relationshipType: 'DESCRIBES',
            relatedSpdxElement: 'SPDXRef-Supervisor'
          },
          { spdxElementId: 'SPDXRef-Supervisor', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-Go' }
        ],
        annotations: [
          {
            annotationType: 'OTHER',
            annotator: 'Tool: Stacktape',
            annotationDate: new Date().toISOString(),
            comment: `Builder: ${GO_BUILDER}; CGO_ENABLED=0; GOOS=linux; GOARCH=amd64; standard library only`
          }
        ]
      },
      null,
      2
    )
  );
  return binary;
};
if (import.meta.main)
  buildSupervisor(process.argv[2] ?? '.stacktape/code-swap/supervisor').catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
