import { App } from 'obsidian';
import {ChangelogSettings} from "./src/ChangelogSettings";
import Changelog from "./src/Changelog";
import {DEFAULT_SETTINGS} from "./src/constants";


const moment = (window as any).moment;

declare global {
    interface Window {
        app: App;
        moment: typeof moment;
    }
}
