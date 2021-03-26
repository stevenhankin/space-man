// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { createHash } from "crypto";

import dirRollUp from "dir-roll-up";
import { DirNode } from "dir-roll-up";

/**
 * Name, Parent, Size
 *
 * TODO: add Colour scale
 */
type TreeMapTuple = [string, string | null, string | number];
type TreeMapView = TreeMapTuple[];

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
    async () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Space Man started...");

      const startTime = new Date().getTime();

      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "spaceman", // Identifies the type of the webview. Used internally
        "Space Man", // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        { enableScripts: true } // Webview options. More on these later.
      );

      let nodeCount = 0;
      panel.webview.html = getWebviewContent([
        ["Name", "Parent", "Size (bytes)"],
      ]);

      let generator = dirRollUp("/Users/stevenhankin/projects/space-man", {
        includePartial: true,
      });

      /**
       * One-to-one map of Node ID to Node
       */
      let idToDirMap = new Map<string, DirNode>();

      /**
       * Dir names are not unique, so store an array of nodes
       * against each name so that a suffix suffix can be added
       * to satisfy the google chart's need for a unique name
       */
      let nameInfoMap = new Map<string, DirNode[]>();

      const interval1 = setInterval(async () => {
        const dirNode = await generator.next();
        const v = dirNode.value;
        idToDirMap.set(v.id, v);
        /**
         * If Node isn't already in the list for it's name..
         */
        const nodesForName = nameInfoMap.get(v.dirName) || [];
        if (!nodesForName.some((n) => n.id === v.id)) {
          /**
           * ..add it in
           */
          nodesForName.push(v);
          nameInfoMap.set(v.dirName, nodesForName);
          nodeCount++;
          console.log(`${v.dirName} has size ${v.sizeOfDir}`);
        }
        if (dirNode.done) {
          clearInterval(interval1);
          const endTime = new Date().getTime();
          vscode.window.showInformationMessage(
            `Space Man completed in ${Math.floor(
              (endTime - startTime) / 1000
            )} seconds 🚀`
          );
        }
      }, 1);

      /**
       * Unique directory name with a numerical suffix if it occurs more than once
       * Will be null for the parent of the root (since there is no higher node)
       * @param id of the node
       * @returns display name
       */
      const getNodeName = (id: string | null) => {
        if (id === null) {
          return null;
        }
        const node = idToDirMap.get(id);
        if (node === undefined) {
          throw Error(`No node matches id ${id}`);
        }
        const nameArray = nameInfoMap.get(node.dirName);
        if (nameArray === undefined) {
          throw Error(`No name array for directory ${node.dirName}`);
        }
        const idx = nameArray.findIndex((n) => n.id === id);
        /**
         * If the node is not first in the array
         * it means there is a duplicate name
         * and this needs a suffix to make the name appear unique
         */
        if (idx > 0) {
          return `${node.dirName} (${idx})`;
        }
        return `${node.dirName}`;
      };

      const interval2 = setInterval(async () => {
        const treeMapView: TreeMapView = [["Name", "Parent", "Size (bytes)"]];
        idToDirMap.forEach((node) => {
          treeMapView.push([
            getNodeName(node.id) as string,
            getNodeName(node.parent),
            node.sizeOfDir,
          ]);
        });
        panel.webview.html = getWebviewContent(treeMapView);
      }, 100);
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(treeMapView: TreeMapView) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <script type="text/javascript">
      google.charts.load('current', {'packages':['treemap']});
      google.charts.setOnLoadCallback(drawChart);
      function drawChart() {
        var data = google.visualization.arrayToDataTable(${JSON.stringify(
          treeMapView
        )});

        tree = new google.visualization.TreeMap(document.getElementById('chart_div'));

        tree.draw(data, {
          minColor: '#f00',
          midColor: '#ddd',
          maxColor: '#0d0',
          headerHeight: 15,
          fontColor: 'black',
          showScale: true,
          maxDepth: 3,
          generateTooltip: showStaticTooltip,
        });

        function showStaticTooltip(row, size, value) {
          return '<div style="background:#fd9; padding:10px; border-style:solid">' +
                 size +'</div>';
        }
      }
    </script>
  </head>
  <body>
    <div id="chart_div" style="width: 900px; height: 500px;"></div>
  </body>
</html>`;
}
