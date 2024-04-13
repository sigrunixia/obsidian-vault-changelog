import {Plugin, debounce, Notice, TFile, Debouncer,} from "obsidian";
import { DEFAULT_SETTINGS } from 'src/constants';
import {ChangelogSettings} from 'src/ChangelogSettings';
import {ChangelogSettingsTab} from 'src/ChangelogSettingsTab';

export default class Changelog extends Plugin implements ChangelogSettings {
    changelogFilePath: string;
    numberOfFilesToShow: number;
    excludePaths: string;
    settings: ChangelogSettings;
    shouldWatchVaultChange: boolean;
    formatAsTable: boolean;
    timeFormatting: string;

    private isProcessingVaultChange = false;

    watchVaultChange: Debouncer<unknown[], unknown> = debounce(
        async () => {
            if (this.isProcessingVaultChange) {
                return;
            }

            this.isProcessingVaultChange = true;
            // console.log('Vault change detected. Updated changelog');
            await this.writeChangelog();
            this.isProcessingVaultChange = false;
        },
        200,
        true
    );

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
                const fileCache = cache.getFileCache(recentlyEditedFile);
                if (fileCache) {
                    const frontMatter = fileCache.frontmatter;
                    return !(frontMatter && frontMatter.publish === false);
                }
                return true; // or false, depending on what you want to do when fileCache is null
            })
            .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
            .slice(0, this.settings.numberOfFilesToShow);
        let changelogContent = `# Changelog\n\n`;
        let header = ``;
        for (let recentlyEditedFile of recentlyEditedFiles) {
            const humanTime = window
                .moment(recentlyEditedFile.stat.mtime)
                .format("HH[h]mm");
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
