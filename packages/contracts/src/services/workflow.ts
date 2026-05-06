import type { LeadStage } from '../enums/index.js';

/**
 * A single canonical step in a business workflow. Every step maps onto one
 * concrete lead `stage` so the live state of any lead is the cursor pointing
 * to its current step. `description` is human-readable copy surfaced in the
 * admin cockpit's workflow viewer.
 */
export interface WorkflowStep {
  key: string;
  label: string;
  stage: LeadStage;
  description: string;
}

/**
 * A named, ordered sequence of WorkflowSteps. `terminalStages` identifies the
 * stages where a lead has exited the active pipeline — converted (won) or
 * lost — so the execution engine in Task 10 can stop advancing them.
 */
export interface WorkflowDefinition {
  slug: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  terminalStages: LeadStage[];
}

/**
 * Compact shape returned by GET /api/workflows for the catalog list — drops
 * the steps array so the inbox-style overview stays light. The detail view
 * fetches the full WorkflowDefinition by slug.
 */
export interface WorkflowSummary {
  slug: string;
  name: string;
  description: string;
  step_count: number;
  terminalStages: LeadStage[];
}

/**
 * The canonical lead-to-customer pipeline. Mirrors the LeadStage enum so the
 * existing PATCH /api/leads/:id status updates double as workflow advancement.
 * Treat this as the source of truth — the admin cockpit reads it via HTTP and
 * future agents (qualification, NBA, recommendation) consume it for routing.
 */
export const LEAD_TO_CUSTOMER_WORKFLOW: WorkflowDefinition = {
  slug: 'lead-to-customer',
  name: 'Lead to Customer',
  description:
    'Standard nurture pipeline taking an inbound lead from first contact through to a closed sale. Mirrors the LeadStage enum so each step maps onto a stage transition recorded by PATCH /api/leads/:id.',
  steps: [
    {
      key: 'capture',
      label: 'Capture',
      stage: 'new',
      description:
        'Lead lands in the inbox via web form, broker referral, or marketing campaign. owner_id is null until presales picks it up.',
    },
    {
      key: 'qualify',
      label: 'Qualify',
      stage: 'qualified',
      description:
        'Presales validates intent, contactability, and rough budget. The lead is assigned to an owner and tagged with any disqualifying signals.',
    },
    {
      key: 'contact',
      label: 'Contact',
      stage: 'contacted',
      description:
        'First substantive outreach — WhatsApp, email, or phone call — capturing notes and the next-best action.',
    },
    {
      key: 'schedule_visit',
      label: 'Schedule visit',
      stage: 'visit_scheduled',
      description:
        'Tour slot agreed with the lead. The visit-service eventually owns the lifecycle from here; for now we just record the stage.',
    },
    {
      key: 'conduct_visit',
      label: 'Conduct visit',
      stage: 'visit_completed',
      description:
        'On-site or virtual property tour completed. Outcome and follow-ups are captured as notes; alternatives shown surface in P2.',
    },
    {
      key: 'negotiate',
      label: 'Negotiate',
      stage: 'negotiation',
      description:
        'Price, terms, and paperwork. crm-service eventually owns the deal record; the stage tracks which leads are mid-deal.',
    },
    {
      key: 'close',
      label: 'Close',
      stage: 'converted',
      description:
        'Lead becomes a customer — booking confirmed and onboarding kicks off. Terminal success state.',
    },
  ],
  terminalStages: ['converted', 'lost'],
};

/** Catalog of every business workflow the platform defines. Keyed by slug. */
export const WORKFLOW_CATALOG: Record<string, WorkflowDefinition> = {
  [LEAD_TO_CUSTOMER_WORKFLOW.slug]: LEAD_TO_CUSTOMER_WORKFLOW,
};

/**
 * Live position of one lead inside a workflow. Computed deterministically from
 * the workflow definition + the lead's current stage, so this never lives in
 * the database — it's recomputed on every read. `current_step_index` is -1
 * when the lead's stage isn't represented as a step (e.g. terminal `lost`),
 * in which case `current_step` is null.
 */
export interface WorkflowExecutionState {
  workflow_slug: string;
  current_step_index: number;
  current_step: WorkflowStep | null;
  next_step: WorkflowStep | null;
  is_terminal: boolean;
  progress_percent: number;
}

/**
 * Pure function — given a workflow definition and a lead stage, compute the
 * execution cursor. No I/O, no DB. Server uses it to power
 * GET /api/leads/:id/execution; clients can mirror it for optimistic UI.
 */
export function computeWorkflowExecution(
  workflow: WorkflowDefinition,
  leadStage: LeadStage,
): WorkflowExecutionState {
  const isTerminal = workflow.terminalStages.includes(leadStage);
  const currentStepIndex = workflow.steps.findIndex((step) => step.stage === leadStage);
  const currentStep = currentStepIndex >= 0 ? (workflow.steps[currentStepIndex] ?? null) : null;
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < workflow.steps.length - 1
      ? (workflow.steps[currentStepIndex + 1] ?? null)
      : null;
  const progressPercent =
    currentStepIndex >= 0
      ? Math.round(((currentStepIndex + 1) / workflow.steps.length) * 100)
      : 0;
  return {
    workflow_slug: workflow.slug,
    current_step_index: currentStepIndex,
    current_step: currentStep,
    next_step: nextStep,
    is_terminal: isTerminal,
    progress_percent: progressPercent,
  };
}
