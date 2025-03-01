import {App} from "obsidian";

declare global {
    interface Window {
        app: App;
        moment: typeof import("moment");
    }
}
