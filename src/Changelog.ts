import {Plugin, debounce, Notice, TFile, Debouncer,} from "obsidian";
import { DEFAULT_SETTINGS } from './constants';
import {ChangelogSettings} from './ChangelogSettings';
import {ChangelogSettingsTab} from './ChangelogSettingsTab';

export default class Changelog extends Plugin implements ChangelogSettings {
    changelogFilePath: string;
    numberOfFilesToShow: number;
    watchVaultChange: Debouncer<unknown[], unknown>;
    excludePaths: string;
    settings: ChangelogSettings;
    shouldWatchVaultChange: boolean;
    formatAsTable: boolean;
    timeFormatting: string;

    async onload() {
        console.log("Loading Changelog plugin");

        await this.loadSettings();

        this.addSettingTab(new ChangelogSettingsTab(this.app, this));

        this.addCommand({
            id: "update",
            name: "update",
            callback: () => this.writeChangelog(),
            hotkeys: [],
        });

        this.watchVaultChange = debounce(
            this.watchVaultChange.bind(this),
            200,
            false
        );
        this.registerWatchVaultEvents();
    }

    registerWatchVaultEvents() {
        if (this.settings.shouldWatchVaultChange) {
            this.registerEvent(this.app.vault.on("modify", this.watchVaultChange));
            this.registerEvent(this.app.vault.on("delete", this.watchVaultChange));
            this.registerEvent(this.app.vault.on("rename", this.watchVaultChange));
        } else {
            this.app.vault.off("modify", this.watchVaultChange);
            this.app.vault.off("delete", this.watchVaultChange);
            this.app.vault.off("rename", this.watchVaultChange);
        }
    }

    async writeChangelog() {
        const changelog = this.buildChangelog();
        await this.writeInFile(this.settings.changelogFilePath, changelog);
    }

    buildChangelog(): string {
        const pathsToExclude = this.settings.excludePaths.split(',');
        const cache = this.app.metadataCache;
        const files = this.app.vault.getFiles();
        const markdownFiles = files.filter(file => file.extension === 'md');
        const recentlyEditedFiles = markdownFiles
            // Remove changelog file from recentlyEditedFiles list
            .filter(
                (recentlyEditedFile) =>
                    recentlyEditedFile.path !== this.settings.changelogFilePath
            )
            // Remove files from paths to be excluded from recentlyEditedFiles list
            .filter(
                function (recentlyEditedFile) {
                    let i;
                    let keep = true;
                    for (i = 0; i < pathsToExclude.length; i++) {
                        if (recentlyEditedFile.path.startsWith(pathsToExclude[i].trim())) {
                            keep = false;
                            break;
                        }
                    }
                    return keep;
                }
            )
            // exclude if specifically told not to
            .filter(recentlyEditedFile => {
                const frontMatter = cache.getFileCache(recentlyEditedFile).frontmatter;
                return !(frontMatter && frontMatter.publish === false);
            })

            .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
            .slice(0, this.settings.numberOfFilesToShow);
        let changelogContent = ``;
        let header = ``;
        for (let recentlyEditedFile of recentlyEditedFiles) {
            // TODO: make date format configurable (and validate it)
            const humanTime = window
                .moment(recentlyEditedFile.stat.mtime)
                .format("YYYY-MM-DD HH[h]mm");
            if (header != humanTime.substring(0, 10)) {
                header = humanTime.substring(0, 10)
                changelogContent += `## ${header}\n`
            }
            changelogContent += `- ${humanTime.substring(10, 16)} · [[${recentlyEditedFile.basename}]]\n`;
        }
        return changelogContent;
    }

    async writeInFile(filePath: string, content: string) {
        const file = this.app.vault.getAbstractFileByPath(filePath),
            isFile = file instanceof TFile;

        if (isFile) {
            await this.app.vault.modify(file, content);
        } else {
            new Notice("Couldn't write changelog: check the file path");
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log("Unloading Changelog plugin");
    }
}
