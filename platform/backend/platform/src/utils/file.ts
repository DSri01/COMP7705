import fs from "fs";

export function checkIfPathExists(path: string): boolean {
    return fs.existsSync(path);
}

export function checkIfPathIsDirectory(path: string): boolean {
    return fs.statSync(path).isDirectory();
}

export function checkIfPathIsFile(path: string): boolean {
    return fs.statSync(path).isFile();
}