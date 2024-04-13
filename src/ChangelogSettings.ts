// ChangelogSettings interface code
export interface ChangelogSettings {
    numberOfFilesToShow: number;
    changelogFilePath: string;
    shouldWatchVaultChange: boolean;
    excludePaths: string;
    formatAsTable: boolean; // Add this line
    timeFormatting: string;
}
