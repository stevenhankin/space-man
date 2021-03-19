// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PathLike, readdir } from "fs";
// import { directoryTree } from "directory-tree";
import { DirNode, processDir } from "dir-roll-up";

import * as vscode from "vscode";
import dirTree = require("directory-tree");
import { sep } from "path";
import { createHash } from "crypto";

/**
 * Used for hashing a directory name
 * @param txt
 * @returns hash in hex format
 */
const encode = (txt: string): string =>
  createHash("md5").update(txt).digest("hex");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "space-man" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "space-man.spaceUsage",
    () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from Space Man!");

      // const path: PathLike = ".";
      // readdir(path, {}, (err, files) => {
      //   console.log({ files });
      // });

      // const moo = async () => {
      //   for await (let x of processDir(".")) {
      //     console.log(x);
      //   }
      // };
      // moo();

      type TreeNode = {
        fileCount: number;
        dirName: string;
        parentDirHash: string | undefined;
        sizeOfDir: number;
        // totalSize: number;
      };

      type TreeModel = {
        [key: string]: TreeNode;
      };

      const treeModel: TreeModel = {};

      const tree = dirTree(
        "/Users/stevenhankin/projects/space-man",
        {},
        (item, path, stats) => {
          if (item.type === "directory") {
            console.log(item);
          }
          // Get the directory the file resides in
          const dirName = path.substr(0, path.lastIndexOf(sep));
          // and convert to a hash
          const dirHash = encode(dirName);
          // and the parent dir (so we can keep a pointer to it for roll-up of space)
          const parentDirName = dirName.substr(0, dirName.lastIndexOf(sep));
          // and also its hash
          const parentDirHash = encode(parentDirName);
          // if it's the top dir level it may not exist
          if (treeModel[parentDirHash] === undefined) {
            treeModel[parentDirHash] = {
              fileCount: 0,
              sizeOfDir: 0,
              dirName: parentDirName,
              parentDirHash: encode(
                parentDirName.substr(0, parentDirName.lastIndexOf(sep))
              ),
            };
          }
          // and see if it is already in out tree model
          let treeDataObj = treeModel[dirHash];
          if (treeDataObj === undefined) {
            // if not, we intialise to a default
            treeModel[dirHash] = {
              fileCount: 1,
              sizeOfDir: item.size,
              dirName,
              parentDirHash,
            };
          } else {
            // otherwise we can update the attributes
            treeDataObj.fileCount++;
            treeDataObj.sizeOfDir += item.size;
          }
        }
      );
      console.log(treeModel);
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
