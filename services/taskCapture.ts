'use client'

// Task capture — wraps POST /ai/tasks via the shared offline-safe submit path.

import { CaptureValidationError, submitCapture, type SubmitResult } from '@/lib/offline/submit'

export type ActivityType =
    | 'irrigation'
    | 'spraying'
    | 'scouting'
    | 'harvest'
    | 'fertilize'
    | 'custom'

export type Priority = 'urgent' | 'high' | 'normal' | 'low'

export interface TaskEntry {
    title: string
    activity_type: ActivityType
    priority: Priority
    field_id?: string | null
    description?: string | null
    task_date?: string | null
}

export const TaskValidationError = CaptureValidationError
export type { SubmitResult }

export function submitTask(fieldLabel: string, entry: TaskEntry): Promise<SubmitResult> {
    return submitCapture({
        kind: 'task',
        endpoint: '/ai/tasks',
        label: `Task — ${entry.title} (${fieldLabel})`,
        body: entry,
    })
}

/** Mark a planner task complete — offline-safe (PATCH replays via the outbox),
 *  so activities recorded in the field without signal sync automatically. */
export function submitTaskCompletion(taskId: string, taskTitle: string): Promise<SubmitResult> {
    return submitCapture({
        kind: 'task',
        endpoint: `/ai/tasks/${taskId}`,
        method: 'PATCH',
        label: `Completed — ${taskTitle}`,
        body: { completed: true },
    })
}
