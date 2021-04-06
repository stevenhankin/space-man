import dirRollUp from "dir-roll-up";
import * as vscode from "vscode";
import { WorkspaceFolder } from "vscode";
import { TreeItemDirNode } from "./TreeItemDirNode";

export class DirTreeProvider
  implements vscode.TreeDataProvider<TreeItemDirNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItemDirNode | undefined | null | void
  > = new vscode.EventEmitter<TreeItemDirNode | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    TreeItemDirNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  /**
   * One-to-one map of Node ID to Node
   */
  idToDirMap = new Map<string, TreeItemDirNode>();

  /**
   * For convenience, keep track of top root-node
   */
  rootNode: TreeItemDirNode | undefined = undefined;
  fileCount: number = 0;
  status: "starting" | "complete" = "starting";

  constructor(
    private workspaceFolders: ReadonlyArray<WorkspaceFolder> | undefined
  ) {
    this.generateModel();
  }

  /**
   * Convert bytes to readable string representation
   * to be displayed in the sidebar
   */
  private formatBytes(a: number, b = 2) {
    if (0 === a) {
      return "0 Bytes";
    }
    const c = 0 > b ? 0 : b,
      d = Math.floor(Math.log(a) / Math.log(1024));
    return (
      parseFloat((a / Math.pow(1024, d)).toFixed(c)) +
      " " +
      ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    );
  }

  getTreeItem(element: TreeItemDirNode): vscode.TreeItem {
    /**
     * The root node has some extra information
     * to indicate the status of the processing
     */
    if (element.dirNode.parent === null) {
      element.description = ` ${
        this.status === "complete" ? "✅" : "᠁"
      } ${this.formatBytes(element.dirNode.rollupSize)}  (${
        this.fileCount
      } files)`;
    } else {
      element.description = this.formatBytes(element.dirNode.rollupSize);
    }
    return element;
  }

  getChildren(element?: TreeItemDirNode): Thenable<TreeItemDirNode[]> {
    if (!this.workspaceFolders) {
      vscode.window.showInformationMessage("No workspace has been opened");
      return Promise.resolve([]);
    }

    if (this.idToDirMap.size === 0 || this.rootNode === undefined) {
      return Promise.resolve([]);
    }

    if (element === undefined) {
      return Promise.resolve([this.rootNode]);
    }

    if (element.getChildNodes === undefined) {
      return Promise.resolve([]);
    }

    return Promise.resolve(element.getChildNodes(this.idToDirMap));
  }

  /**
   *
   */
  generateModel() {
    // Display a message box to the user
    vscode.window.showInformationMessage("Space Man started...");

    const startTime = new Date().getTime();

    if (vscode.workspace.workspaceFolders) {
      const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.path;

      this.fileCount = 0;

      let generator = dirRollUp(workspaceFolderPath, {
        includePartial: true,
      });

      /**
       * Update the tree view periodically
       */
      const viewInterval = setInterval(() => {
        this.rootNode?.setDirNode(this.rootNode.dirNode, this.fileCount);
        this._onDidChangeTreeData.fire();
        console.log(this.idToDirMap.size, this.fileCount);
      }, 1000);

      /**
       * Obtain stream of directory stats
       */
      const dirNodeInterval = setInterval(async () => {
        const dirNodeSeq = await generator.next();
        const dirNode = dirNodeSeq.value;

        // Add this node to its parent's child list
        if (dirNode.parent !== null) {
          const parentNode = this.idToDirMap.get(dirNode.parent);
          if (parentNode && dirNode.id) {
            parentNode.addChild(dirNode.id);
          }
        }

        let dNode = this.idToDirMap.get(dirNode.id);
        if (dNode === undefined) {
          dNode = new TreeItemDirNode(dirNode);
          this.idToDirMap.set(dirNode.id, dNode);
          this.fileCount += dirNode.fileCount;
        } else {
          dNode.setDirNode(dirNode, this.fileCount);
        }

        // If it's the first node, it's also the root node
        if (this.rootNode === undefined) {
          this.rootNode = dNode;
        }

        // Stop processing when last item iterated
        if (dirNodeSeq.done) {
          clearInterval(dirNodeInterval);
          clearInterval(viewInterval);
          const endTime = new Date().getTime();
          this.status = "complete";
          vscode.window.showInformationMessage(
            `Space Man completed in ${Math.floor(
              (endTime - startTime) / 1000
            )} seconds 🚀`
          );
        }
      }, 1);
    }
  }
}
