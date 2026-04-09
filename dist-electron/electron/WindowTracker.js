import activeWindow from "active-win";
export class WindowTracker {
    async getActiveWindow() {
        try {
            const result = await activeWindow();
            if (!result)
                return null;
            return {
                title: result.title,
                app: result.owner.name,
                owner: result.owner.path,
                pid: result.owner.processId,
            };
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }
}
