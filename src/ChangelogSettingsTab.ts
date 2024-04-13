import {App, PluginSettingTab, Setting} from "obsidian";
import Changelog from '../main';

export class ChangelogSettingsTab extends PluginSettingTab {
    plugin: Changelog;

    constructor(app: App, plugin: Changelog) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

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
                        this.plugin.saveSettings().then(() => {
                            console.log('Settings saved successfully');
                        }).catch((error) => {
                            console.error('Failed to save settings:', error);
                        });
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
                            this.plugin.saveSettings().then(() => {
                                console.log('Settings saved successfully');
                            }).catch((error) => {
                                console.error('Failed to save settings:', error);
                            });
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
                    .setValue(this.plugin.settings.shouldWatchVaultChange)
                    .onChange((value) => {
                        this.plugin.settings.shouldWatchVaultChange = value;
                        this.plugin.saveSettings().then(() => {
                            console.log('Settings saved successfully');
                            this.plugin.registerWatchVaultEvents();
                        }).catch((error) => {
                            console.error('Failed to save settings:', error);
                        });
                    })
            );

        new Setting(containerEl)
            .setName("Excluded paths")
            .setDesc("Paths or folders to ignore from changelog, separated by a comma")
            .addText((text) => {
                text
                    .setPlaceholder("Example: Meetings,People")
                    .setValue(settings.excludePaths)
                    .onChange((value) => {
                        settings.excludePaths = value;
                        this.plugin.saveSettings().then(() => {
                            console.log('Settings saved successfully');
                        }).catch((error) => {
                            console.error('Failed to save settings:', error);
                        });
                    });
            });
    }
}
