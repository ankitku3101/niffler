import z from "zod";

export const RecommendedActionSchema = z.enum(["CAPTURE_PAYMENT", "RECOVERY_LINK", "ESCALATE", "STOP"]);

export const DiagnosisSchema = z.object({
    diagnosis: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()),
    recommendedAction: RecommendedActionSchema,
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;