import type { InspectionTypeConfig } from "@/types/inspection";

/**
 * Regular Check — the standard recurring Luz inspection, based on the
 * Luz Master Checklist. Zones, guidance and checklist items are pure
 * configuration: nothing here is hardcoded in the app screens.
 *
 * Every checklist item maps to exactly one of the 5 fixed Property
 * Health dimensions defined in src/types/inspection.ts.
 */
export const regularCheck: InspectionTypeConfig = {
  id: "regular-check",
  title: "Regular Check",
  zones: [
    {
      id: "entrance-access",
      title: "Entrance / Access",
      reminder: "Front door, locks, alarm and signs of entry.",
      checklist: [
        {
          id: "entrance-door-locks",
          label: "Test front door, locks and keys turn smoothly",
          healthDimension: "Security & Access",
          isRequired: true,
        },
        {
          id: "entrance-alarm",
          label: "Confirm alarm arms and disarms correctly",
          healthDimension: "Security & Access",
          isRequired: true,
        },
        {
          id: "entrance-forced-entry",
          label: "Look for signs of attempted entry or tampering",
          healthDimension: "Security & Access",
          isRequired: true,
        },
        {
          id: "entrance-key-box",
          label: "Check key box / smart lock works and is undamaged",
          healthDimension: "Security & Access",
        },
        {
          id: "entrance-mailbox",
          label: "Empty mailbox; check for uncollected notices",
          healthDimension: "Security & Access",
        },
        {
          id: "entrance-lighting",
          label: "Test porch and entrance lighting",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "entrance-intercom",
          label: "Test doorbell and intercom",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "entrance-door-frame",
          label: "Look for damp, warping or cracks around the door frame",
          healthDimension: "Building Condition",
        },
      ],
    },
    {
      id: "living-areas",
      title: "Living Areas",
      reminder: "Windows, walls, ceilings and climate control.",
      checklist: [
        {
          id: "living-windows-shutters",
          label: "Open and close all windows, blinds and shutters",
          healthDimension: "Building Condition",
          isRequired: true,
        },
        {
          id: "living-ceiling-damp",
          label: "Scan ceilings and walls for damp patches, stains or cracks",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "living-musty-smell",
          label: "Note any musty smell; ventilate the room if needed",
          healthDimension: "Water & Humidity",
        },
        {
          id: "living-window-locks",
          label: "Check window locks and handles engage properly",
          healthDimension: "Security & Access",
        },
        {
          id: "living-climate",
          label: "Run AC / heating briefly and check airflow",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "living-sockets-lights",
          label: "Test light switches and visible sockets",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "living-furniture-floors",
          label: "Check furniture, floors and interior doors for damage",
          healthDimension: "Building Condition",
        },
      ],
    },
    {
      id: "kitchen",
      title: "Kitchen",
      reminder: "Water, appliances, gas and ventilation.",
      checklist: [
        {
          id: "kitchen-under-sink-leaks",
          label: "Check under-sink area for leaks or moisture",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "kitchen-taps-drainage",
          label: "Run taps; check pressure, hot water and drainage",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "kitchen-appliance-hoses",
          label: "Check dishwasher and washing machine hoses for drips",
          healthDimension: "Water & Humidity",
        },
        {
          id: "kitchen-appliances",
          label: "Power on fridge, oven, hob and extractor",
          healthDimension: "Utilities & Systems",
          isRequired: true,
        },
        {
          id: "kitchen-fridge-seals",
          label: "Check fridge seals and any ice build-up",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "kitchen-gas",
          label: "Check gas bottle / connection for smell or corrosion",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "kitchen-cabinets",
          label: "Inspect cabinets, worktops and tiles for damage",
          healthDimension: "Building Condition",
        },
        {
          id: "kitchen-pests",
          label: "Look for signs of pests or droppings",
          healthDimension: "Building Condition",
        },
      ],
    },
    {
      id: "bedrooms",
      title: "Bedrooms",
      reminder: "Damp, shutters, AC and balcony doors.",
      checklist: [
        {
          id: "bedrooms-damp-mould",
          label: "Check wardrobes, mattresses and corners for damp or mould",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "bedrooms-window-seals",
          label: "Check window seals for condensation or water ingress",
          healthDimension: "Water & Humidity",
        },
        {
          id: "bedrooms-shutters",
          label: "Operate shutters and windows in every bedroom",
          healthDimension: "Building Condition",
        },
        {
          id: "bedrooms-walls-ceilings",
          label: "Scan walls and ceilings for stains or cracks",
          healthDimension: "Building Condition",
        },
        {
          id: "bedrooms-ac",
          label: "Test AC units and remotes; glance at filters",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "bedrooms-balcony-doors",
          label: "Check balcony doors close and lock properly",
          healthDimension: "Security & Access",
        },
      ],
    },
    {
      id: "bathrooms",
      title: "Bathrooms",
      reminder: "Run water, check seals, drains and mould.",
      checklist: [
        {
          id: "bathrooms-toilets",
          label: "Flush toilets; check refill and no running water",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "bathrooms-showers-drains",
          label: "Run showers and taps; confirm drains clear with no smell",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "bathrooms-under-basin",
          label: "Check under-basin pipework for drips",
          healthDimension: "Water & Humidity",
        },
        {
          id: "bathrooms-mould",
          label: "Look for mould on ceilings and around the shower",
          healthDimension: "Water & Humidity",
        },
        {
          id: "bathrooms-silicone-grout",
          label: "Inspect silicone joints, grout and tiles",
          healthDimension: "Building Condition",
        },
        {
          id: "bathrooms-window",
          label: "Check bathroom window closes and seals properly",
          healthDimension: "Building Condition",
        },
        {
          id: "bathrooms-extractor",
          label: "Test extractor fan",
          healthDimension: "Utilities & Systems",
        },
      ],
    },
    {
      id: "utilities-systems",
      title: "Utilities / Systems",
      reminder: "Electrics, water heater, meters and detectors.",
      checklist: [
        {
          id: "utilities-breaker-panel",
          label: "Check breaker panel; no tripped switches",
          healthDimension: "Utilities & Systems",
          isRequired: true,
        },
        {
          id: "utilities-meters",
          label: "Read water and electricity meters; note unusual consumption",
          healthDimension: "Utilities & Systems",
          isRequired: true,
        },
        {
          id: "utilities-water-heater",
          label: "Inspect water heater / boiler for leaks or corrosion",
          healthDimension: "Water & Humidity",
          isRequired: true,
        },
        {
          id: "utilities-stopcock",
          label: "Locate and test main water stopcock",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "utilities-wifi",
          label: "Confirm Wi-Fi router is online",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "utilities-detectors",
          label: "Test smoke / CO detectors",
          healthDimension: "Utilities & Systems",
        },
        {
          id: "utilities-room-damp",
          label: "Check utility room for damp or unusual smells",
          healthDimension: "Water & Humidity",
        },
      ],
    },
    {
      id: "outdoor-areas",
      title: "Outdoor Areas",
      reminder: "Terraces, facade, drainage and perimeter.",
      checklist: [
        {
          id: "outdoor-terrace-drains",
          label: "Clear terrace and balcony drains; check for standing water",
          healthDimension: "Outdoor Areas",
          isRequired: true,
        },
        {
          id: "outdoor-gates-fences",
          label: "Check gates and fences close and lock",
          healthDimension: "Security & Access",
          isRequired: true,
        },
        {
          id: "outdoor-furniture-awnings",
          label: "Check outdoor furniture and awnings are secure and undamaged",
          healthDimension: "Outdoor Areas",
        },
        {
          id: "outdoor-terrace-surface",
          label: "Check terrace tiles and railings for loose or broken parts",
          healthDimension: "Building Condition",
        },
        {
          id: "outdoor-facade",
          label: "Scan facade and external walls for cracks or flaking paint",
          healthDimension: "Building Condition",
        },
        {
          id: "outdoor-roof-gutters",
          label: "Look at roofline and gutters for damage or blockage",
          healthDimension: "Building Condition",
        },
        {
          id: "outdoor-lighting",
          label: "Test exterior lighting and motion sensors",
          healthDimension: "Utilities & Systems",
        },
      ],
    },
    {
      id: "pool-garden",
      title: "Pool / Garden",
      reminder: "Pool condition, pump room, irrigation and garden.",
      requiresFeature: "poolGarden",
      checklist: [
        {
          id: "pool-water-level",
          label: "Check pool water level, clarity and cover condition",
          healthDimension: "Outdoor Areas",
          isRequired: true,
        },
        {
          id: "pool-pump-room",
          label: "Inspect pump room for leaks; run pump and filter",
          healthDimension: "Utilities & Systems",
          isRequired: true,
        },
        {
          id: "pool-chemistry",
          label: "Check chlorine / pH levels",
          healthDimension: "Outdoor Areas",
        },
        {
          id: "pool-safety",
          label: "Check pool fence, alarm or safety cover devices",
          healthDimension: "Security & Access",
        },
        {
          id: "garden-irrigation",
          label: "Run irrigation cycle; check sprinkler heads and timer",
          healthDimension: "Outdoor Areas",
          isRequired: true,
        },
        {
          id: "garden-outdoor-taps",
          label: "Test outdoor taps; check for leaks",
          healthDimension: "Water & Humidity",
        },
        {
          id: "garden-condition",
          label: "Check garden, trees and hedges for overgrowth or storm damage",
          healthDimension: "Outdoor Areas",
        },
      ],
    },
  ],
};
