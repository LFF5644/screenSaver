#!/usr/bin/env node
const buildCharacterMap=require("./lib/buildCharacterMap");
const child_process=require("child_process");
const fs=require("fs");

const compressedCharacter_file="build/characters.bin";
const fontSizes=[2,3,4,5,8];

let config={};
try{
	config=JSON.parse(fs.readFileSync("./config.json"));
}catch(e){
	fs.writeFileSync("./config.json","{}");
	config={};
}

function writeConfig(cb){
	fs.writeFile("./config.json",JSON.stringify(config,null,"\t")+"\n",cb);
}

const file="/sys/class/graphics/fb0/virtual_size";

const screenSize=fs.readFileSync(file,"utf-8").trim().split(",");
if(screenSize.length!==2) throw new Error("file includes wrong data");

config.screen_height=Number(screenSize[1]);
config.screen_width=Number(screenSize[0]);

try{
	config.frameBufferLength=fs.readFileSync("/dev/fb0").length;
}catch(e){
	console.log(e);
	console.log("\nCan't open framebuffer try to run this programm with sudo or run 'sudo usermod -aG video "+process.env.USER+"' to give you permissions for this file this have affect after system restart");
	process.exit(1);
}

console.log(`Screen: ${config.screen_width}x${config.screen_height}`);

console.log(`Frame-Size: ${config.frameBufferLength} Bytes`);

let bpp=null;
try{
	bpp=String(
		child_process.execSync("fbset -i | grep 'Visual'")
			.toString("utf-8")
			.trim()
			.split(":")[1]
			.trim()
	);
}catch(e){
	bpp=null;
}
if(bpp==="TRUECOLOR"){
	console.log(`Virtual: "${bpp}" bytesPerPixel 4`);
	bpp=4;
}
else if(bpp==="PSEUDOCOLOR"){
	console.log(`Virtual: "${bpp}" bytesPerPixel 1`);
	bpp=1;
}
else if(bpp===null){
	console.log("WARNING: fbset is not install cant get COLOR MODE default is TRUECOLOR if this do not work try other or install fbset")
	bpp=4;
}
else{
	console.log(`WARNING: virtual: ${bpp} is not supported! try to use TRUECOLOR`);
	bpp=4;
}

let real_screen_width=0;
try{
	real_screen_width=Number(
		child_process.execSync("fbset -i | grep 'LineLength'")
			.toString("utf-8")
			.trim()
			.split(":")[1]
			.trim()
	);
}catch(e){
	real_screen_width=0; // this throw the error / say user that programm is not installed
}

if(real_screen_width===0||isNaN(real_screen_width)){
	console.log("WARNING: can not get screen width without fbset if you have errors install it!");
}
else if(real_screen_width/bpp!==config.screen_width){
	config.screen_width=real_screen_width/bpp;
	console.log(`FBSET lineLength: ${config.screen_width} Bytes`);
}

try{child_process.execSync("mkdir build");}catch(e){}

config={
	screen_height: config.screen_height,
	screen_width: config.screen_width,
	frameBufferLength: config.frameBufferLength,
	frameBufferPath: config.frameBufferPath?config.frameBufferPath:"/dev/fb0",
	bytesPerPixel: bpp,
};
console.log("build CharacterMap ...");
const charsBuffer=buildCharacterMap.compressCharacters(JSON.parse(fs.readFileSync("./characters.json","utf-8")),fontSizes);
console.log("write into file "+compressedCharacter_file+" "+charsBuffer.length+" Bytes ...");
fs.writeFile(compressedCharacter_file,charsBuffer,(err)=>{
	if(err) throw err;
	console.log(compressedCharacter_file+" was saved successfully!");
});

writeConfig(err=>{
	if(err) throw new Error("Cant save config");
	console.log("Saved into Config!");
});
