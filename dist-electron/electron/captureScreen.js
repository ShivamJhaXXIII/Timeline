import { desktopCapturer } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
function toDateFolderParts(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    return [year, month, day, hour];
}
function clampQuality(quality) {
    if (Number.isNaN(quality))
        return 85;
    return Math.min(100, Math.max(1, Math.round(quality)));
}
export async function captureScreen(options) {
    const outputDir = options.outputDir.trim();
    if (!outputDir) {
        throw new Error('A screenshot output directory is required.');
    }
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
            width: 1920,
            height: 1080,
        },
    });
    const screen = sources.find((source) => !source.thumbnail.isEmpty()) ?? sources[0];
    if (!screen) {
        throw new Error('No screen sources are available for capture.');
    }
    const thumbnail = screen.thumbnail;
    if (thumbnail.isEmpty()) {
        throw new Error('The captured screen thumbnail was empty.');
    }
    const now = new Date();
    const folderPath = path.join(outputDir, ...toDateFolderParts(now));
    await fs.mkdir(folderPath, { recursive: true });
    const timestamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const fileName = `screenshot-${timestamp}-${randomUUID()}.jpg`;
    const filePath = path.join(folderPath, fileName);
    const image = thumbnail.toJPEG(clampQuality(options.quality ?? 85));
    await fs.writeFile(filePath, image);
    return filePath;
}
