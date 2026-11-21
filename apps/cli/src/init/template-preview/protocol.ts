/**
 * How the init wizard and a template preview child talk (`compile.ts` starts one, `child.ts` is one).
 *
 * Kept free of imports: the CLI's entry reads `TEMPLATE_PREVIEW_ARGUMENT` before it loads anything else, and the
 * wizard's server reads the rest without loading the synthesis.
 */

/** The only argument of a CLI process started to compile one template preview. */
export const TEMPLATE_PREVIEW_ARGUMENT = '__init-template-preview';

/** Marks the result line, so whatever else the compile prints on stdout is never mistaken for it. */
export const RESULT_MARKER = '@@stacktape-template-preview@@';

/** What the wizard asks to compile: the configuration as an object, and the stack it would be deployed as. */
export type TemplatePreviewRequest = {
  /** The configuration, already parsed (YAML) or evaluated (TypeScript). */
  config: Record<string, unknown>;
  projectName: string;
  stage: string;
  region: string;
  /** The AWS account the stack would go to, when the wizard knows it. Physical names derive from it. */
  accountId?: string;
  /** The project's folder: relative paths in the configuration (an app directory, a Dockerfile) resolve from it. */
  workingDir: string;
  /** Whether the deploy reports to the Stacktape Console, which adds the resources that do. */
  consoleConnected: boolean;
};

/** What the child prints: the template as YAML and which Stacktape resource each AWS resource belongs to. */
export type TemplatePreviewResult =
  | {
      ok: true;
      /** The template, as `stacktape synth` writes it. */
      text: string;
      /** The resource of the configuration each logical ID was created for; absent for the stack's shared ones. */
      owners: Record<string, string>;
    }
  | { ok: false; error: string };
