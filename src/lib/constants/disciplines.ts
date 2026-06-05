/** Seed rows for discipline_master */
export const DISCIPLINE_MASTER_SEED = [
  {
    discipline_code: "PWR",
    discipline_name: "Power",
    description: "Electrical power distribution, UPS, PDU, and grounding",
  },
  {
    discipline_code: "CLG",
    discipline_name: "Cooling",
    description: "HVAC, chilled water, and thermal management systems",
  },
  {
    discipline_code: "NET",
    discipline_name: "Network",
    description: "Structured cabling, fiber, and network infrastructure",
  },
  {
    discipline_code: "SEC",
    discipline_name: "Security",
    description: "Access control, CCTV, and physical security systems",
  },
  {
    discipline_code: "FPS",
    discipline_name: "Fire Protection",
    description: "Fire detection, suppression, and life-safety systems",
  },
  {
    discipline_code: "BMS",
    discipline_name: "Monitoring / BMS",
    description: "Building management, DCIM, and monitoring integration",
  },
  {
    discipline_code: "CIV",
    discipline_name: "Civil / Structural",
    description: "Raised floor, containment, and structural scope",
  },
] as const;
