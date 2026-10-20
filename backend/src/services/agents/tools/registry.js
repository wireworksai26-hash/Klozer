import { consultAgent, transferToAgent } from "./agentTools.js";
import { handoffToHuman } from "./handoffTool.js";
import { lookupOrder } from "./orderTool.js";
import { checkStock } from "./stockTool.js";
import { createTaskTool } from "./taskTool.js";

/** The implementation of every tool in toolCatalog.js, by name. */
export const TOOLS = Object.freeze(Object.fromEntries([checkStock, lookupOrder, createTaskTool, handoffToHuman, consultAgent, transferToAgent].map((t) => [t.name, t])));
