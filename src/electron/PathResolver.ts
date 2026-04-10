import path from "path";
import { app } from "electron";

export const getPreloadPath = () => {
    return path.join(app.getAppPath(), "dist-electron", "electron", "preload.cjs");
}