import { Notice, Plugin, TFile, debounce, moment } from "obsidian";

import {
	ChangelogSettings,
	ChangelogSettingsTab,
	DEFAULT_SETTINGS,
} from "./settings";

// Add styles for the excluded folders list
// TODO: Move this to a styles.css file
const EXCLUDED_FOLDERS_STYLES = `
.excluded-folders-list {
	margin-bottom: 1em;
}

.excluded-folder-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: var(--background-secondary);
	border-radius: 4px;
	padding: 4px 8px;
	margin-bottom: 6px;
}

.excluded-folder-remove {
	cursor: pointer;
	border: none;
	background: transparent;
	color: var(--text-muted);
	padding: 0 4px;
	font-size: 14px;
}

.excluded-folder-remove:hover {
	color: var(--text-error);
}`;

export default class ChangelogPlugin extends Plugin {
	settings: ChangelogSettings = DEFAULT_SETTINGS;
	private styleEl: HTMLStyleElement;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ChangelogSettingsTab(this.app, this));

		this.addCommand({
			id: "update-changelog",
			name: "Update Changelog",
			callback: () => this.updateChangelog(),
		});

		// Add styles for the excluded folders feature
		this.styleEl = document.createElement("style");
		this.styleEl.textContent = EXCLUDED_FOLDERS_STYLES;
		document.head.appendChild(this.styleEl);

		this.onVaultChange = debounce(this.onVaultChange.bind(this), 200);
		this.enableAutoUpdate();
	}

	onunload() {
		// Remove styles when plugin is disabled
		if (this.styleEl && this.styleEl.parentNode) {
			this.styleEl.parentNode.removeChild(this.styleEl);
		}
	}

	enableAutoUpdate() {
		if (this.settings.autoUpdate) {
			this.registerEvent(this.app.vault.on("modify", this.onVaultChange));
			this.registerEvent(this.app.vault.on("delete", this.onVaultChange));
			this.registerEvent(this.app.vault.on("rename", this.onVaultChange));
		}
	}

	disableAutoUpdate() {
		this.app.vault.off("modify", this.onVaultChange);
		this.app.vault.off("delete", this.onVaultChange);
		this.app.vault.off("rename", this.onVaultChange);
	}

	onVaultChange(file: TFile) {
		if (file.path !== this.settings.changelogPath) {
			this.updateChangelog();
		}
	}

	async updateChangelog() {
		const changelog = await this.generateChangelog();
		await this.writeToFile(this.settings.changelogPath, changelog);
	}

	async generateChangelog() {
		const recentFiles = this.getRecentlyEditedFiles();

		let changelogContent = "";
		recentFiles.forEach((file) => {
			const formattedTime = moment(file.stat.mtime).format(
				this.settings.datetimeFormat,
			);
			changelogContent += `- ${formattedTime} · [[${file.basename}]]\n`;
		});

		return changelogContent;
	}

	getRecentlyEditedFiles() {
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => {
				// Exclude the changelog file itself
				if (file.path === this.settings.changelogPath) {
					return false;
				}

				// Exclude files in excluded folders
				for (const folder of this.settings.excludedFolders) {
					if (file.path.startsWith(folder)) {
						return false;
					}
				}

				return true;
			})
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, this.settings.maxRecentFiles);
	}

	async writeToFile(path: string, content: string) {
		let file = this.app.vault.getAbstractFileByPath(path);
		if (!file) {
			file = await this.app.vault.create(path, "");
		}
		if (file instanceof TFile) {
			await this.app.vault.modify(file, content);
		} else {
			new Notice(`Could not update changelog at path: ${path}`);
		}
	}

	async loadSettings() {
		const loadedSettings = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedSettings,
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
