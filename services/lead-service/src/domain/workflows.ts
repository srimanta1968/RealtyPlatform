import {
  WORKFLOW_CATALOG,
  type WorkflowDefinition,
  type WorkflowSummary,
} from '@kiana/contracts';

export class WorkflowNotFoundError extends Error {
  constructor(slug: string) {
    super(`Workflow ${slug} is not defined.`);
    this.name = 'WorkflowNotFoundError';
  }
}

/** Catalog of every workflow currently defined. Backed by the static @kiana/contracts catalog. */
export function listWorkflowSummaries(): WorkflowSummary[] {
  return Object.values(WORKFLOW_CATALOG).map((workflow) => ({
    slug: workflow.slug,
    name: workflow.name,
    description: workflow.description,
    step_count: workflow.steps.length,
    terminalStages: workflow.terminalStages,
  }));
}

/** Resolve a workflow definition by slug; throws when the slug isn't registered. */
export function getWorkflowBySlug(slug: string): WorkflowDefinition {
  const workflow = WORKFLOW_CATALOG[slug];
  if (!workflow) throw new WorkflowNotFoundError(slug);
  return workflow;
}
