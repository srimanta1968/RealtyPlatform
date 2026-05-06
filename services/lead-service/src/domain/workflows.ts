import {
  WORKFLOW_CATALOG,
  type LeadStage,
  type LeadStageCount,
  type WorkflowDefinition,
  type WorkflowMetrics,
  type WorkflowStepMetric,
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

/**
 * Compose WorkflowMetrics from a workflow definition and the raw per-stage
 * lead counts. Pure function — no DB calls. The caller (lead-service domain)
 * supplies counts via the repository's countByStage(). Lost leads are
 * tracked separately and excluded from per-step `count_reached` because we
 * don't record the step at which they dropped out.
 */
export function composeWorkflowMetrics(
  workflow: WorkflowDefinition,
  stageCounts: LeadStageCount[],
): WorkflowMetrics {
  const countByStage = new Map<LeadStage, number>();
  for (const row of stageCounts) {
    countByStage.set(row.stage, row.count);
  }
  const stageOf = (stage: LeadStage): number => countByStage.get(stage) ?? 0;

  const totalLeads = stageCounts.reduce((sum, row) => sum + row.count, 0);
  const converted = stageOf('converted');
  const lost = stageOf('lost');
  const activeLeads = totalLeads - converted - lost;
  const conversionRate = totalLeads === 0 ? 0 : converted / totalLeads;
  const lossRate = totalLeads === 0 ? 0 : lost / totalLeads;

  // Cumulative reach per step: for step i, sum of leads at stages of steps i..end.
  const stepStages = workflow.steps.map((step) => step.stage);
  const steps: WorkflowStepMetric[] = workflow.steps.map((step, index) => {
    const reachedStages = stepStages.slice(index);
    const countReached = reachedStages.reduce((sum, stage) => sum + stageOf(stage), 0);
    return {
      step_key: step.key,
      stage: step.stage,
      count_at: stageOf(step.stage),
      count_reached: countReached,
      reach_rate: totalLeads === 0 ? 0 : countReached / totalLeads,
    };
  });

  return {
    workflow_slug: workflow.slug,
    total_leads: totalLeads,
    active_leads: activeLeads,
    converted,
    lost,
    conversion_rate: conversionRate,
    loss_rate: lossRate,
    steps,
  };
}
