import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { WindowInfo } from "./types/WindowInfo.js";

// Promisified wrapper so we can use async/await with child process execution.
const execFileAsync = promisify(execFile);

function resolvePowerShellPath(): string {
  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  const candidate = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return existsSync(candidate) ? candidate : "powershell.exe";
}

// Small PowerShell script that calls Win32 APIs to read the currently focused window.
// It returns a single JSON object to stdout, which the Node process parses.
const WINDOWS_ACTIVE_WINDOW_SCRIPT = String.raw`
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class NativeMethods {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

$hwnd = [NativeMethods]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) {
  ""
  exit 0
}

$pid = 0
[NativeMethods]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
if (-not $pid) {
  ""
  exit 0
}

$sb = New-Object System.Text.StringBuilder 2048
[NativeMethods]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
$title = $sb.ToString()

$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
if (-not $proc) {
  ""
  exit 0
}

[PSCustomObject]@{
  title = $title
  app = $proc.ProcessName
  owner = $proc.Path
  pid = [int]$pid
} | ConvertTo-Json -Compress
`;

// Executes the Win32 PowerShell script and maps JSON output to the app's WindowInfo type.
async function getActiveWindowFromPowerShell(): Promise<WindowInfo | null> {
    const { stdout } = await execFileAsync(
    resolvePowerShellPath(),
        [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            WINDOWS_ACTIVE_WINDOW_SCRIPT
        ],
        { windowsHide: true, maxBuffer: 1024 * 1024 }
    );

    const payload = stdout.trim();
    if (!payload) return null;

    const parsed = JSON.parse(payload) as WindowInfo;
    return {
        title: parsed.title ?? "",
        app: parsed.app ?? "",
        owner: parsed.owner ?? "",
        pid: parsed.pid ?? 0,
    };
}


export class WindowTracker {
  // Public API used by Electron IPC handlers.
  // On Windows, it fetches the foreground window; on unsupported platforms, it returns null.
    async getActiveWindow(): Promise<WindowInfo | null> {
        try {
            if (process.platform === "win32") {
                return await getActiveWindowFromPowerShell();
            }
            return null;
        } catch(err) {
            console.log(err);
            return null;
        }
    }
}


