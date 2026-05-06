import type { NotificationTemplate } from '@kiana/contracts';

/**
 * Minimal {{handlebars}}-style renderer for the Phase-1 notification
 * templates. Supports flat top-level placeholders only (e.g. {{full_name}},
 * {{lead_url}}); nested paths and helpers can land in Phase 2 once the
 * template registry grows beyond the four canonical slugs. Nullish values
 * render as the empty string so a missing optional field never leaks raw
 * "{{key}}" into a customer-facing email.
 */
export type RenderContext = Record<string, string | number | null | undefined>;

export interface RenderedTemplate {
  subject: string | null;
  body: string;
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function renderTemplate(
  template: Pick<NotificationTemplate, 'subject' | 'body'>,
  context: RenderContext,
): RenderedTemplate {
  return {
    subject: template.subject ? renderString(template.subject, context) : null,
    body: renderString(template.body, context),
  };
}

function renderString(input: string, context: RenderContext): string {
  return input.replace(PLACEHOLDER, (_match, key: string) => {
    const value = context[key];
    return value === null || value === undefined ? '' : String(value);
  });
}
