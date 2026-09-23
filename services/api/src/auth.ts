import crypto from "node:crypto";
import { getDatabase } from "./database/db.js";

export type AuthUser={id:string;email:string;displayName:string|null};

function hashPassword(password:string,salt=crypto.randomBytes(16).toString("hex")){
 const hash=crypto.scryptSync(password,salt,64).toString("hex");return salt+":"+hash;
}
function verifyPassword(password:string,stored:string){
 const [salt,expected]=stored.split(":");if(!salt||!expected)return false;
 const actual=crypto.scryptSync(password,salt,64).toString("hex");
 return crypto.timingSafeEqual(Buffer.from(actual,"hex"),Buffer.from(expected,"hex"));
}
function tokenHash(token:string){return crypto.createHash("sha256").update(token).digest("hex");}

export async function signup(email:string,password:string,displayName?:string){
 const db=getDatabase();if(!db)throw new Error("Database is not configured");
 if(password.length<8)throw new Error("Password must be at least 8 characters");
 const normalized=email.trim().toLowerCase();
 const exists=await db.query("SELECT id FROM users WHERE email=$1",[normalized]);if(exists.rowCount)throw new Error("Email already registered");
 const r=await db.query("INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,email,display_name",[normalized,displayName??null,hashPassword(password)]);
 return createSession(r.rows[0]);
}
export async function login(email:string,password:string){
 const db=getDatabase();if(!db)throw new Error("Database is not configured");
 const r=await db.query("SELECT id,email,display_name,password_hash FROM users WHERE email=$1",[email.trim().toLowerCase()]);
 const u=r.rows[0];if(!u?.password_hash||!verifyPassword(password,u.password_hash))throw new Error("Invalid email or password");
 return createSession(u);
}
async function createSession(u:any){
 const db=getDatabase()!;const token=crypto.randomBytes(32).toString("base64url");const expires=new Date(Date.now()+1000*60*60*24*30);
 await db.query("INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)",[u.id,tokenHash(token),expires]);
 return {token,expiresAt:expires.toISOString(),user:{id:u.id,email:u.email,displayName:u.display_name??null}};
}
export async function authenticateToken(token:string|undefined):Promise<AuthUser|null>{
 const db=getDatabase();if(!db||!token)return null;
 const r=await db.query("SELECT u.id,u.email,u.display_name FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()",[tokenHash(token)]);
 return r.rows[0]?{id:r.rows[0].id,email:r.rows[0].email,displayName:r.rows[0].display_name}:null;
}
export async function logout(token:string){const db=getDatabase();if(!db)return false;const r=await db.query("UPDATE user_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",[tokenHash(token)]);return (r.rowCount??0)>0;}
export function bearer(header:string|undefined){return header?.startsWith("Bearer ")?header.slice(7):undefined;}
