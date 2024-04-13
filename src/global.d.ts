// global.d.ts
import { App } from 'obsidian';

declare global {
    interface Window {
        app: App;
        moment: any;
    }
}
