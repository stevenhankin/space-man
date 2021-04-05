import * as vscode from "vscode";

import { DirTreeProvider } from "./DirTreeProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "space-man" is now active!');

  if (vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      "spaceMan",
      new DirTreeProvider(vscode.workspace.workspaceFolders)
    );
  }
}

export function deactivate() {}
