export { cn } from "cn"

export function getInitials(name?: string): string {
  if (!name) return "SP"
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
