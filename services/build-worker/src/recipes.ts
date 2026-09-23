export type BuildTarget="node"|"python"|"flutter-apk"|"flutter-aab"|"blender"|"godot"|"unity"|"unreal";
export type Recipe={target:BuildTarget;label:string;requiredCommands:string[];commands:string[][];artifacts:string[];timeoutMs:number};
const recipes:Record<BuildTarget,Recipe>={
 node:{target:"node",label:"Node.js",requiredCommands:["node","npm"],commands:[["npm","ci"],["npm","run","build"]],artifacts:["dist","build"],timeoutMs:20*60_000},
 python:{target:"python",label:"Python",requiredCommands:["python3"],commands:[["python3","-m","compileall","."]],artifacts:["."],timeoutMs:10*60_000},
 "flutter-apk":{target:"flutter-apk",label:"Flutter APK",requiredCommands:["flutter"],commands:[["flutter","pub","get"],["flutter","analyze"],["flutter","build","apk","--release"]],artifacts:["build/app/outputs/flutter-apk/app-release.apk"],timeoutMs:45*60_000},
 "flutter-aab":{target:"flutter-aab",label:"Flutter AAB",requiredCommands:["flutter"],commands:[["flutter","pub","get"],["flutter","analyze"],["flutter","build","appbundle","--release"]],artifacts:["build/app/outputs/bundle/release/app-release.aab"],timeoutMs:45*60_000},
 blender:{target:"blender",label:"Blender",requiredCommands:["blender"],commands:[["blender","--background","--python-expr","print('Genesis Blender worker ready')"]],artifacts:[".blend"],timeoutMs:20*60_000},
 godot:{target:"godot",label:"Godot",requiredCommands:["godot"],commands:[["godot","--headless","--editor","--quit"]],artifacts:["build"],timeoutMs:30*60_000},
 unity:{target:"unity",label:"Unity",requiredCommands:["unity-editor"],commands:[["unity-editor","-batchmode","-quit","-nographics","-projectPath","."]],artifacts:["Builds","build"],timeoutMs:60*60_000},
 unreal:{target:"unreal",label:"Unreal Engine",requiredCommands:["UnrealEditor"],commands:[["UnrealEditor","-run=DerivedDataCache","-unattended","-nop4"]],artifacts:["Build","Saved","Binaries"],timeoutMs:90*60_000}
};
export function getRecipe(target:string):Recipe{const r=recipes[target as BuildTarget];if(!r)throw new Error("Unsupported build target: "+target);return r;}
