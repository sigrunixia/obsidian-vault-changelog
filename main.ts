import {
    App,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    debounce,
    TFile,
} from "obsidian";

import type moment from "moment";

const DEFAULT_SETTINGS: ChangelogSettings = {
    numberOfFilesToShow: 10,
    changelogFilePath: "",
    watchVaultChange: false,
};

declare global {
    interface Window {
        app: App;
        moment: typeof moment;
    }
}

export default class Changelog extends Plugin {
    settings: ChangelogSettings;

    debouncedWatchVaultChange: any;
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

        this.debouncedWatchVaultChange = debounce(
            this.watchVaultChange.bind(this),
            200,
            false
        );
        this.registerWatchVaultEvents();
    }

    registerWatchVaultEvents() {
        if (this.settings.watchVaultChange) {
            this.registerEvent(this.app.vault.on("modify", this.debouncedWatchVaultChange));
            this.registerEvent(this.app.vault.on("delete", this.debouncedWatchVaultChange));
            this.registerEvent(this.app.vault.on("rename", this.debouncedWatchVaultChange));
        } else {
            this.app.vault.off("modify", this.debouncedWatchVaultChange);
            this.app.vault.off("delete", this.debouncedWatchVaultChange);
            this.app.vault.off("rename", this.debouncedWatchVaultChange);
        }
    }

    async watchVaultChange(file: any) {
        if (file.path === this.settings.changelogFilePath) {
            return;
        } else {
            try {
                console.log('Starting to write changelog...');
                await this.writeChangelog();
                console.log('Changelog written successfully!');
            } catch (error) {
                console.error('Error while writing changelog:', error);
            }
        }
    }

    async writeChangelog() {
        const changelog = await this.buildChangelog();
        await this.writeInFile(this.settings.changelogFilePath, changelog);
    }

    async buildChangelog(): Promise<string> {
        const files = this.app.vault.getMarkdownFiles();
        const recentlyEditedFiles = files
            // Remove changelog file from recentlyEditedFiles list
            .filter(
                (recentlyEditedFile) =>
                    recentlyEditedFile.path !== this.settings.changelogFilePath
            )
            .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
            .slice(0, this.settings.numberOfFilesToShow);

        // Group files by date
        const filesGroupedByDate: { [date: string]: TFile[] } = {};
        for (let file of recentlyEditedFiles) {
            const date = window.moment(file.stat.mtime).format("YYYY-MM-DD");
            if (!filesGroupedByDate[date]) {
                filesGroupedByDate[date] = [];
            }
            filesGroupedByDate[date].push(file);
        }

        // Build changelog content
        let changelogContent = ``;
        for (let date in filesGroupedByDate) {
            changelogContent += `## [[${date}]]\n`;

            // Read all files in parallel
            const fileContents = await Promise.all(
                filesGroupedByDate[date].map(file => this.app.vault.read(file))
            );

            for (let i = 0; i < filesGroupedByDate[date].length; i++) {
                const file = filesGroupedByDate[date][i];
                const time = window.moment(file.stat.mtime).format("HH:mm");
                let fileContent = fileContents[i];
                let fileName = file.basename;

                if (fileContent.includes('publish: false')) {
                    fileName = file.basename;
                } else {
                    fileName = `[[${file.basename}]]`;
                }

                changelogContent += `- ${time} - ${fileName}\n`;
            }
        }
        return changelogContent;
    }

    async writeInFile(filePath: string, content: string) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            new Notice("Couldn't write changelog: check the file path");
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettingsWithLogging() {
        try {
            await this.saveSettings();
            console.log('Settings saved successfully!');
        } catch (error) {
            console.error('Error while saving settings:', error);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log("Unloading Changelog plugin");
    }
}

interface ChangelogSettings {
    changelogFilePath: string;
    numberOfFilesToShow: number;
    watchVaultChange: boolean;
}

class ChangelogSettingsTab extends PluginSettingTab {
    plugin: Changelog;

    constructor(app: App, plugin: Changelog) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        const settings = this.plugin.settings;

        new Setting(containerEl)
            .setName("Changelog note location")
            .setDesc("Changelog file absolute path (including the extension)")
            .addText((text) => {
                text
                    .setPlaceholder("Example: Folder/Changelog.md")
                    .setValue(settings.changelogFilePath)
                    .onChange((value) => {
                        settings.changelogFilePath = value;
                        void this.plugin.saveSettingsWithLogging();
                    });
            });

        new Setting(containerEl)
            .setName("Number of recent files in changelog")
            .setDesc("Number of most recently edited files to show in the changelog")
            .addText((text) =>
                text
                    .setValue(String(settings.numberOfFilesToShow))
                    .onChange((value) => {
                        if (!isNaN(Number(value))) {
                            settings.numberOfFilesToShow = Number(value);
                            void this.plugin.saveSettingsWithLogging();
                        }
                    })
            );

        new Setting(containerEl)
            .setName("Automatically update changelog")
            .setDesc(
                "Automatically update changelog on any vault change (modification, renaming or deletion of a note)"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.watchVaultChange)
                    .onChange((value) => {
                        this.plugin.settings.watchVaultChange = value;
                        void this.plugin.saveSettingsWithLogging();
                        this.plugin.registerWatchVaultEvents();
                    })
            );
    }
}
