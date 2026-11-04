// Master Bed Ruang HCU RSUD Welas Asih
export const REGULAR_BEDS = Array.from({ length: 19 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0")
  return `Bed ${num}`
})

export const ISOLATION_BEDS = ["Isolasi 1", "Isolasi 2"]

export const ALL_BEDS = [...REGULAR_BEDS, ...ISOLATION_BEDS]

