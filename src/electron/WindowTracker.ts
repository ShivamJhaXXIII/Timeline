import activeWindow from "active-win";
import type { WindowInfo } from "./types/WindowInfo.js";


export class WindowTracker {
    async getActiveWindow(): Promise<WindowInfo | null> {
        try {
            const result = await activeWindow();
            if (!result) return null;
            return {
                title: result.title,
                app: result.owner.name,
                owner: result.owner.path,
                pid: result.owner.processId,
            }
        } catch(err) {
            console.log(err);
            return null;
        }
    }
}


