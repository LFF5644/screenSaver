#!/bin/env node
const importFolder="/home/lff/bind/myOwnProgrammes/nodejs/require";	// https://github.com/LFF5644/node-modules
const cursor=require(importFolder+"/cursor.js");
const figlet=require("figlet");
const {spawn}=require("child_process");

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
	let text=buffer.toString("utf-8");

	text+=cursor.changePosition(1,1);
	text+="\x1b[0m";	// color reset
	text+="\x1b[31m";	// color to red
	text+="\x1b[1m";	// color to bright
	text+=getTime();
	text+="\x1b[0m";	// color reset

	process.stdout.write(text);
});
