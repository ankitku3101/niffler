import axios from "axios"

// Generous: an owner-triggered batch run holds its request open for as long as the agent takes.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 60_000,
})
