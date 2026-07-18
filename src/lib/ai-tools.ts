/**
 * Gen AI Tool Calling — Staff Enforcement Agent.
 *
 * Defines structured function schemas that map natural-language commands
 * from operations staff onto real, executable application actions.
 *
 * These schemas are consumed by the LLM (Gemini functionDeclarations /
 * OpenAI tools) in the staff chat route. The matching executors live in
 * ./staff-actions.
 *
 * Gate namespace matches the rest of the app: "Gate G1".."Gate G8".
 */

export interface ToolParameter {
  type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT" | "ARRAY";
  description?: string;
  enum?: string[];
}

export interface ToolFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolDeclarationGroup {
  functionDeclarations: ToolFunctionDeclaration[];
}

const GATE_ENUM = [
  "Gate G1",
  "Gate G2",
  "Gate G3",
  "Gate G4",
  "Gate G5",
  "Gate G6",
  "Gate G7",
  "Gate G8",
  "main-hub",
];

/**
 * Staff tool schemas for agentic control of the stadium flow system.
 */
export const staffTools: ToolDeclarationGroup = {
  functionDeclarations: [
    {
      name: "toggleGateAccess",
      description:
        "Closes, opens, or limits a stadium entrance/exit gate. Use when a staff member instructs to change a gate's operating state.",
      parameters: {
        type: "OBJECT",
        properties: {
          gateId: {
            type: "STRING",
            description: "The identifier of the gate, e.g. 'Gate G3' or 'Gate G1'.",
            enum: GATE_ENUM,
          },
          status: {
            type: "STRING",
            description: "Target operating state for the gate.",
            enum: ["OPEN", "CLOSED", "LIMITED"],
          },
        },
        required: ["gateId", "status"],
      },
    },
    {
      name: "deployOperationalPersonnel",
      description:
        "Dispatches roaming operations staff or security stewards to a gate or transit area to relieve congestion or handle an incident.",
      parameters: {
        type: "OBJECT",
        properties: {
          location: {
            type: "STRING",
            description: "Target area like 'Gate G4' or 'main-hub'.",
            enum: GATE_ENUM,
          },
          count: {
            type: "NUMBER",
            description: "Number of stewards/personnel to dispatch.",
          },
        },
        required: ["location", "count"],
      },
    },
  ],
};

/** Flat lookup of function declarations by name. */
export const staffToolMap: Record<string, ToolFunctionDeclaration> =
  Object.fromEntries(
    staffTools.functionDeclarations.map((f) => [f.name, f]),
  );
