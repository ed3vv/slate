import { NextRequest, NextResponse } from "next/server";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Store the process globally (in production, use a proper process manager)
let trackerProcess: ReturnType<typeof spawn> | null = null;

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json();
    console.log(`[Focus Tracker API] Action: ${action}, User: ${userId}`);

    if (action === "start") {
      if (trackerProcess) {
        console.log("[Focus Tracker API] Tracker already running");
        return NextResponse.json(
          { error: "Tracker is already running" },
          { status: 400 }
        );
      }

      // Path to the Python script
      const scriptPath = path.join(process.cwd(), "focus_tracker.py");
      console.log(`[Focus Tracker API] Starting script at: ${scriptPath}`);
      console.log(`[Focus Tracker API] User ID: ${userId}`);

      // Start the Python script with environment variables
      trackerProcess = spawn("/usr/local/bin/python3", [scriptPath], {
        env: {
          ...process.env,
          SLATE_USER_ID: userId,
        },
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      console.log(`[Focus Tracker API] Process started with PID: ${trackerProcess.pid}`);

      // Handle process events
      trackerProcess.on("error", (error) => {
        console.error("[Focus Tracker API] Process error:", error);
        trackerProcess = null;
      });

      trackerProcess.on("exit", (code) => {
        console.log(`[Focus Tracker API] Process exited with code ${code}`);
        trackerProcess = null;
      });

      // Log stdout/stderr
      trackerProcess.stdout?.on("data", (data) => {
        console.log(`[Focus Tracker] ${data.toString().trim()}`);
      });

      trackerProcess.stderr?.on("data", (data) => {
        console.error(`[Focus Tracker ERROR] ${data.toString().trim()}`);
      });

      return NextResponse.json({
        success: true,
        message: "Focus tracker started",
        pid: trackerProcess.pid,
      });
    } else if (action === "stop") {
      if (!trackerProcess) {
        console.log("[Focus Tracker API] No tracker running to stop");
        return NextResponse.json(
          { error: "Tracker is not running" },
          { status: 400 }
        );
      }

      console.log(`[Focus Tracker API] Stopping process PID: ${trackerProcess.pid}`);

      // Kill the process
      trackerProcess.kill("SIGTERM");
      trackerProcess = null;

      console.log("[Focus Tracker API] Process stopped successfully");

      return NextResponse.json({
        success: true,
        message: "Focus tracker stopped",
      });
    } else if (action === "status") {
      return NextResponse.json({
        isRunning: trackerProcess !== null,
        pid: trackerProcess?.pid || null,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Focus tracker API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    isRunning: trackerProcess !== null,
    pid: trackerProcess?.pid || null,
  });
}
