import z from "zod";

export const CaseStatusSchema = z.enum([
    "DETECTED",
    "INVESTIGATING",
    "ACTION_PLANNED",
    "ACTION_EXECUTED",
    "RECOVERED",
    "FAILED",
    "ESCALATED",
    "STOPPED"
]) 

export type CaseStatus = z.infer<typeof CaseStatusSchema>

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
    DETECTED: ["INVESTIGATING"],
    INVESTIGATING: ["ACTION_PLANNED"],
    ACTION_PLANNED: ["ACTION_EXECUTED"],
    ACTION_EXECUTED: ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"],
    ESCALATED: ["STOPPED"],
    RECOVERED: [],
    FAILED: [],
    STOPPED: []
};

export function canTransition(from: CaseStatus, to: CaseStatus) : boolean {
    return TRANSITIONS[from].includes(to)
}