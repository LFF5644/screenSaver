#!/bin/env node
const importFolder="/home/lff/bind/myOwnProgrammes/nodejs/require";	// https://github.com/LFF5644/node-modules
const cursor=require(importFolder+"/cursor.js");
const figlet=require("figlet");
const {spawn}=require("child_process");
const {LINES,COLUMNS}=process.env;
let message="";

function getTime(){
	const date=new Date();
	const hours=String(date.getHours()).padStart(2,"0");
	const minutes=String(date.getMinutes()).padStart(2,"0");
	const logStr=`${hours.split("").join(" ")} : ${minutes.split("").join(" ")}`
	const text=figlet.textSync(logStr);
	return text;
}

const spawnedProcess=spawn("cmatrix",["-u","10"]);
spawnedProcess.stdout.on("data",buffer=>{
	let text="";
	text+="\033[u";		// load cursor position
	text+=buffer.toString("utf-8");
	text+="\033[s"; 	// save cursor position

	const time=getTime();
	const showColumn=Math.round((COLUMNS/2)-time.split("\n")[0].length/2);
	const showLine=Math.round((LINES/2)-time.split("\n").length/2);

	text+=cursor.changePosition(1,1);
	text+="\x1b[0m";	// color reset
	text+="\x1b[34m";	// color to blue
	text+="\x1b[1m";	// color to bright
	text+=(time
		.split("\n")
		.map(item=>item
			.split("")
			.map(i=>i!==" "?i:(
				"\033[1C"	// move cursor "->"
			))
			.join("")
		)
		.map((item,index)=>(
			cursor.changePosition(
					showLine+index,
					showColumn
				)+
				item
			)
		)
		.join("\n")+"\n"+message
	);
	text+="\x1b[0m";	// color reset

	process.stdout.write(text);
});

process.stdin.setRawMode(true);
process.stdin.on("data",buffer=>{
	const char=buffer.toString("utf-8");
	if(char==="q"){
		process.stdout.write(
			cursor.changePosition(1,1)+
			"\x1b[0m"+	// color reset
			"\033[2J"	// clear console
		);
		process.exit(0);
	}
	if(char==="\r"){
		message="";
		return;
	}
	message+=buffer.toString("utf-8");
});
