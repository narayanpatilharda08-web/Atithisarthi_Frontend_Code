"use strict";
// Local artifact construction only. Never loads dotenv, starts the app, contacts
// a provider, deploys, or changes the checked-in HTML/runtime policy.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),{isIP}=require("node:net");
const PROJECT_ROOT=path.resolve(__dirname,"../.."),SCHEMA="TASK7_FRONTEND_RELEASE_CONFIG_V1",MANIFEST="_release-manifest.json";
const PAGES=["admin.html","index.html","kitchen-display.html","menu.html","order-tracking.html","qr-order-status.html","rooms.html","staff-orders.html"];
const POLICY_PAGES=new Set(["index.html","menu.html","admin.html","staff-orders.html","order-tracking.html"]);
const ASSET_DIRS=["css","data","img","js","vendor"];
const POLICY_KEYS=["allowOrderWhatsAppFallbackOnSaveFailure","openWhatsAppAfterVerifiedOnlinePayment","roomCombinedCheckoutFrontendEnabled"];
const POLICY_META=["app-allow-order-whatsapp-fallback-on-save-failure","app-open-whatsapp-after-verified-online-payment","app-room-combined-checkout-frontend-enabled"];
const fail=code=>Object.assign(new Error(code),{code});
const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
function exactKeys(value,keys){return value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join("\0")===[...keys].sort().join("\0");}
function within(base,target){const relative=path.relative(base,target);return!!relative&&!path.isAbsolute(relative)&&relative!==".."&&!relative.startsWith(".."+path.sep);}
function noLinks(base,target){
  if(target!==base&&!within(base,target))throw fail("TASK7_RELEASE_PATH_OUTSIDE_ROOT");
  let current=base;
  for(const name of ["",...path.relative(base,target).split(path.sep).filter(Boolean)]){
    if(name)current=path.join(current,name);
    if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw fail("TASK7_RELEASE_SYMLINK_DENIED");
  }
}
function validateConfig(input){
  if(!exactKeys(input,["schema","environment","backendBaseUrl","apiBaseUrl","contactSheetUrl","policies"])||input.schema!==SCHEMA||!["synthetic","test","production"].includes(input.environment)||!exactKeys(input.policies,POLICY_KEYS)||POLICY_KEYS.some(key=>typeof input.policies[key]!=="boolean"&&input.policies[key]!=="preserve"))throw fail("TASK7_RELEASE_CONFIG_INVALID");
  function url(value,{originOnly=false,empty=false}={}){
    if(empty&&value==="")return null;
    if(typeof value!=="string"||!value||value!==value.trim())throw fail("TASK7_RELEASE_URL_INVALID");
    let parsed;try{parsed=new URL(value);}catch{throw fail("TASK7_RELEASE_URL_INVALID");}
    if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.href!==value+(originOnly?"/":"")||(originOnly&&parsed.origin!==value))throw fail("TASK7_RELEASE_URL_INVALID");
    const synthetic=parsed.hostname==="localhost"||parsed.hostname.endsWith(".localhost")||parsed.hostname==="127.0.0.1"||parsed.hostname==="[::1]"||parsed.hostname.endsWith(".invalid");
    if(isIP(parsed.hostname.replace(/^\[|\]$/g,""))&&!synthetic)throw fail("TASK7_RELEASE_URL_INVALID");
    if((input.environment==="synthetic")!==synthetic)throw fail("TASK7_RELEASE_TARGET_ENVIRONMENT_MISMATCH");
    return parsed;
  }
  url(input.backendBaseUrl,{originOnly:true});
  url(input.apiBaseUrl);
  if(input.apiBaseUrl!==input.backendBaseUrl+"/api")throw fail("TASK7_RELEASE_MIXED_API_TARGET");
  url(input.contactSheetUrl,{empty:true});
  return{schema:SCHEMA,environment:input.environment,backendBaseUrl:input.backendBaseUrl,apiBaseUrl:input.apiBaseUrl,contactSheetUrl:input.contactSheetUrl,
    policies:Object.fromEntries(POLICY_KEYS.map(key=>[key,input.policies[key]]))};
}
function replaceMeta(source,name,value,required,preserve=false){
  const pattern=new RegExp(`(<meta\\s+name="${name}"\\s+content=")([^"]*)("\\s*\\/?>)`,"ig");
  const matches=[...source.matchAll(pattern)];
  if(matches.length>1||(required&&matches.length!==1))throw fail("TASK7_RELEASE_META_CONTRACT_INVALID");
  if(!matches.length||preserve)return source;
  const escaped=String(value).replaceAll("&","&amp;").replaceAll('"',"&quot;");
  return source.replace(pattern,(_whole,prefix,_old,suffix)=>prefix+escaped+suffix);
}
function stamp(source,page,config){
  let result=replaceMeta(source,"app-backend-base-url",config.backendBaseUrl,true);
  result=replaceMeta(result,"app-api-base-url",config.apiBaseUrl,true);
  result=replaceMeta(result,"app-contact-sheet-url",config.contactSheetUrl,page==="index.html");
  // A preserve policy still requires the reviewed tag contract, then retains
  // each page's exact value/markup. Blank values must not become false/defaults.
  POLICY_KEYS.forEach((key,index)=>{result=replaceMeta(result,POLICY_META[index],String(config.policies[key]),POLICY_PAGES.has(page),config.policies[key]==="preserve");});
  return result;
}
const privateName=name=>name.startsWith(".")||/^(?:node_modules|scripts|tests|dist|coverage|credentials.*|package(?:-lock)?\.json|Thumbs\.db)$/i.test(name)||/\.(?:map|log|key|pem|pfx|p12|dump|backup|bak)$/i.test(name);
const publicExtension=name=>/\.(?:css|js|json|png|jpg|jpeg|jfif|webp|svg|gif|ico|avif|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(name)||/\.LICENSE\.md$/i.test(name);
function sourceFiles(root){
  const source=path.join(root,"frontend");noLinks(root,source);
  const rootHtml=fs.readdirSync(source).filter(name=>name.endsWith(".html")).sort();
  if(rootHtml.join("\0")!==PAGES.join("\0"))throw fail("TASK7_RELEASE_PAGE_SCOPE_CHANGED");
  const files=[...PAGES,"_headers"];
  function visit(directory){for(const entry of fs.readdirSync(path.join(source,directory),{withFileTypes:true})){
    const relative=path.join(directory,entry.name),absolute=path.join(source,relative);
    if(fs.lstatSync(absolute).isSymbolicLink())throw fail("TASK7_RELEASE_SYMLINK_DENIED");
    if(privateName(entry.name))continue;
    if(entry.isDirectory())visit(relative);else if(entry.isFile()&&publicExtension(entry.name))files.push(relative.replaceAll("\\","/"));
  }}
  for(const directory of ASSET_DIRS){const absolute=path.join(source,directory);if(fs.existsSync(absolute)){noLinks(source,absolute);visit(directory);}}
  for(const relative of files){const absolute=path.join(source,relative);noLinks(source,absolute);if(!fs.statSync(absolute).isFile())throw fail("TASK7_RELEASE_ASSET_NOT_REGULAR");}
  return files.sort();
}
function artifactDigest(files){return hash(files.map(file=>`${file.path}\0${file.outputSha256}\n`).join(""));}
function outputLocation(root,value){
  if(typeof value!=="string"||!value)throw fail("TASK7_RELEASE_OUTPUT_REQUIRED");
  const allowed=path.join(root,".cache/task7e/frontend"),target=path.resolve(root,value);
  if(!within(allowed,target))throw fail("TASK7_RELEASE_OUTPUT_OUTSIDE_AREA");
  noLinks(root,target);return{allowed,target};
}
function walkOutput(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{
  const absolute=path.join(root,entry.name);if(fs.lstatSync(absolute).isSymbolicLink())throw fail("TASK7_RELEASE_SYMLINK_DENIED");
  return entry.isDirectory()?walkOutput(absolute).map(name=>entry.name+"/"+name):[entry.name];
}).sort();}
function buildRelease({configPath,outputPath},{projectRoot=PROJECT_ROOT}={}){
  const root=fs.realpathSync(projectRoot),{allowed,target}=outputLocation(root,outputPath);
  if(fs.existsSync(target))throw fail("TASK7_RELEASE_OUTPUT_ALREADY_EXISTS");
  const inputPath=path.resolve(root,configPath||"");
  if(!configPath||!inputPath.endsWith(".json")||!fs.lstatSync(inputPath).isFile()||fs.lstatSync(inputPath).isSymbolicLink()||fs.statSync(inputPath).size>65536)throw fail("TASK7_RELEASE_CONFIG_FILE_INVALID");
  const inputBytes=fs.readFileSync(inputPath);let input;try{input=JSON.parse(inputBytes.toString("utf8").replace(/^\uFEFF/,""));}catch{throw fail("TASK7_RELEASE_CONFIG_JSON_INVALID");}
  const config=validateConfig(input),files=sourceFiles(root),source=path.join(root,"frontend");
  fs.mkdirSync(allowed,{recursive:true});noLinks(root,allowed);fs.mkdirSync(path.dirname(target),{recursive:true});noLinks(root,path.dirname(target));
  const lock=target+".lock";let lockFd,staging;
  try{
    lockFd=fs.openSync(lock,"wx");if(fs.existsSync(target))throw fail("TASK7_RELEASE_OUTPUT_ALREADY_EXISTS");
    staging=fs.mkdtempSync(path.join(allowed,".stage-"));const entries=[];
    for(const relative of files){const original=fs.readFileSync(path.join(source,relative));
      const output=PAGES.includes(relative)?Buffer.from(stamp(original.toString("utf8"),relative,config)):original;
      const destination=path.join(staging,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,output,{flag:"wx"});
      entries.push({path:relative,sourceBytes:original.length,sourceSha256:hash(original),outputBytes:output.length,outputSha256:hash(output)});
    }
    // Recheck originals after copying, so a concurrent editor cannot be silently
    // represented by a mixture of old and new source bytes.
    for(const entry of entries)if(hash(fs.readFileSync(path.join(source,entry.path)))!==entry.sourceSha256)throw fail("TASK7_RELEASE_SOURCE_CHANGED_DURING_BUILD");
    const manifest={schema:"TASK7_FRONTEND_RELEASE_MANIFEST_V1",scope:"LOCAL_ARTIFACT_ONLY_NO_DEPLOYMENT",builderNode:process.versions.node,builderSha256:hash(fs.readFileSync(__filename)),inputConfigSha256:hash(inputBytes),config,configSha256:hash(JSON.stringify(config)),artifactSha256:artifactDigest(entries),files:entries};
    fs.writeFileSync(path.join(staging,MANIFEST),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
    if(fs.existsSync(target))throw fail("TASK7_RELEASE_OUTPUT_ALREADY_EXISTS");fs.renameSync(staging,target);staging=undefined;
    return verifyRelease(outputPath,{projectRoot:root});
  }finally{
    if(staging){const resolved=path.resolve(staging);if(!within(allowed,resolved))throw fail("TASK7_RELEASE_CLEANUP_PATH_INVALID");noLinks(root,resolved);fs.rmSync(resolved,{recursive:true,force:true});}
    if(lockFd!==undefined){fs.closeSync(lockFd);fs.unlinkSync(lock);}
  }
}
function verifyRelease(outputPath,{projectRoot=PROJECT_ROOT}={}){
  const root=fs.realpathSync(projectRoot),{target}=outputLocation(root,outputPath);noLinks(target,path.join(target,MANIFEST));
  const manifest=JSON.parse(fs.readFileSync(path.join(target,MANIFEST),"utf8"));
  if(!exactKeys(manifest,["schema","scope","builderNode","builderSha256","inputConfigSha256","config","configSha256","artifactSha256","files"])||manifest.schema!=="TASK7_FRONTEND_RELEASE_MANIFEST_V1"||manifest.scope!=="LOCAL_ARTIFACT_ONLY_NO_DEPLOYMENT"||!Array.isArray(manifest.files)||manifest.builderSha256!==hash(fs.readFileSync(__filename))||!/^\d+\.\d+\.\d+$/.test(manifest.builderNode)||!/^[a-f0-9]{64}$/.test(manifest.inputConfigSha256))throw fail("TASK7_RELEASE_MANIFEST_INVALID");
  const config=validateConfig(manifest.config),expected=sourceFiles(root),names=manifest.files.map(file=>file.path);
  if(names.join("\0")!==expected.join("\0")||walkOutput(target).join("\0")!==[...expected,MANIFEST].sort().join("\0")||manifest.configSha256!==hash(JSON.stringify(config)))throw fail("TASK7_RELEASE_MANIFEST_SCOPE_INVALID");
  for(const entry of manifest.files){
    if(!exactKeys(entry,["path","sourceBytes","sourceSha256","outputBytes","outputSha256"]))throw fail("TASK7_RELEASE_MANIFEST_INVALID");
    const original=fs.readFileSync(path.join(root,"frontend",entry.path)),output=fs.readFileSync(path.join(target,entry.path));
    const expectedOutput=PAGES.includes(entry.path)?Buffer.from(stamp(original.toString("utf8"),entry.path,config)):original;
    if(entry.sourceBytes!==original.length||entry.sourceSha256!==hash(original)||entry.outputBytes!==output.length||entry.outputSha256!==hash(output)||!output.equals(expectedOutput))throw fail("TASK7_RELEASE_BYTES_MISMATCH");
  }
  if(manifest.artifactSha256!==artifactDigest(manifest.files))throw fail("TASK7_RELEASE_DIGEST_MISMATCH");
  return{schema:manifest.schema,scope:manifest.scope,environment:config.environment,files:manifest.files.length,configSha256:manifest.configSha256,artifactSha256:manifest.artifactSha256,sourceUnchanged:true};
}
function main(args=process.argv.slice(2)){
  const options={};for(const arg of args){const match=/^--(config|out|verify)=(.+)$/.exec(arg);if(!match||options[match[1]])throw fail("TASK7_RELEASE_ARGUMENT_INVALID");options[match[1]]=match[2];}
  let result;if(options.verify){if(Object.keys(options).length!==1)throw fail("TASK7_RELEASE_ARGUMENT_INVALID");result=verifyRelease(options.verify);}
  else{if(!options.config||!options.out||Object.keys(options).length!==2)throw fail("TASK7_RELEASE_ARGUMENT_INVALID");result=buildRelease({configPath:options.config,outputPath:options.out});}
  console.log(JSON.stringify(result));return result;
}
if(require.main===module){try{main();}catch(error){console.error(/^TASK7_RELEASE_[A-Z_]+$/.test(error?.code||"")?error.code:"TASK7_RELEASE_FAILED");process.exitCode=1;}}
module.exports={validateConfig,stamp,buildRelease,verifyRelease,main};
