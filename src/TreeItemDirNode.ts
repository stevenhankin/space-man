import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import dirRollUp, { DirNode } from "dir-roll-up";

/**
 * Wraps Directory Nodes
 */
export class TreeItemDirNode extends vscode.TreeItem {
  private _childNodeIDs = new Set<string>();

  constructor(public dirNode: DirNode) {
    super(dirNode.dirName, TreeItemCollapsibleState.None);
    this.setDirNode(dirNode, 0);
  }

  /**
   * Directory node will get updated multiple times
   * when it has subdirectories
   */
  setDirNode(dirNode: dirRollUp.DirNode, fileCount: number) {
    this.id = dirNode.id;
    this.dirNode = dirNode;
  }

  /**
   * When a child node is added to the parent
   * the parent node also becomes expandable
   */
  public addChild(childId: string) {
    this._childNodeIDs.add(childId);
    if (this.collapsibleState === TreeItemCollapsibleState.None) {
      this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }
  }

  private notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
  }

  public getChildNodes(
    idToDirMap: Map<string, TreeItemDirNode>
  ): TreeItemDirNode[] {
    const nodes = Array.from(this._childNodeIDs)
      .map((id) => idToDirMap.get(id))
      .filter(this.notEmpty);
    return nodes;
  }
}
