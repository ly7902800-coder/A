import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

type ServerConfig={name:string;url:string;headers?:Record<string,string>};
const servers=new Map<string,ServerConfig>();
const clients=new Map<string,Client>();

export function registerMcpServer(config:ServerConfig){servers.set(config.name,config);return {name:config.name,url:config.url};}
export function listMcpServers(){return [...servers.values()].map(s=>({name:s.name,url:s.url,connected:clients.has(s.name)}));}

async function connect(name:string){
 const cfg=servers.get(name);if(!cfg)throw new Error("MCP server not registered: "+name);
 let client=clients.get(name);if(client)return client;
 client=new Client({name:"Genesis AI",version:"0.1.0"});
 const transport=new StreamableHTTPClientTransport(new URL(cfg.url),{requestInit:{headers:cfg.headers??{}}});
 await client.connect(transport);
 clients.set(name,client);return client;
}

export async function listMcpTools(server?:string){
 const names=server?[server]:[...servers.keys()];
 const result:any[]=[];
 for(const name of names){const c=await connect(name);const tools=await c.listTools();for(const t of tools.tools??[])result.push({server:name,...t});}
 return result;
}

export async function callMcpTool(server:string,name:string,arguments_:Record<string,unknown>={}){
 const c=await connect(server);
 return c.callTool({name,arguments:arguments_});
}

export async function disconnectMcpServer(name:string){const c=clients.get(name);if(c){await c.close();clients.delete(name);return true;}return false;}
