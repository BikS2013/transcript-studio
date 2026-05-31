import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";

import { buildProcessingPlan } from "./commands.js";
import type { ProcessingPlanRequest, ProcessingRunResult } from "../../shared/types.js";

export async function runProcessingPlan(request: ProcessingPlanRequest): Promise<ProcessingRunResult> {
  const plan = await buildProcessingPlan(request);
  const { stdout, stderr, exitCode } = await execFileResult(plan.command.executable, plan.command.args);
  if (exitCode !== 0) {
    throw new Error(`${plan.command.executable} exited with code ${exitCode}: ${stderr || stdout}`);
  }

  const info = await stat(plan.outputPath);
  return {
    plan,
    exitCode,
    outputPath: plan.outputPath,
    sizeBytes: info.size,
    stdout,
    stderr,
    validation: {
      exists: true,
      nonEmpty: info.size > 0
    }
  };
}

function execFileResult(
  executable: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error !== null && typeof error === "object" && "code" in error && typeof error.code !== "number") {
          reject(error);
          return;
        }
        resolve({
          stdout,
          stderr,
          exitCode:
            error !== null && typeof error === "object" && "code" in error && typeof error.code === "number"
              ? error.code
              : 0
        });
      }
    );
  });
}
