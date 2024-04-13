import {ChangelogSettings} from './ChangelogSettings';

export const DEFAULT_SETTINGS: ChangelogSettings = {
    numberOfFilesToShow: 10,
    changelogFilePath: "",
    shouldWatchVaultChange: true,
    excludePaths: "",
    formatAsTable: false,
    timeFormatting: "YYYY-MM-DD [at] HH[h]mm",
};
