import axios from "axios"

// Generous, not tight: the API is always on, but a few dashboard pages fan out into several
// queries before they can render, and an owner-triggered batch run holds its request open for
// as long as the agent takes.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 60_000,
})
