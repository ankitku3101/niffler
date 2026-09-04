import axios from "axios"

// Generous, not tight: the API spins down when idle, and a cold start legitimately takes ~50s.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 60_000,
})
