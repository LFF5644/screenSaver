#!/bin/env node
const figlet=require("figlet");
const {spawn}=require("child_process");

const data={
	lastTime:null,
}

function getTime(){
	const date=new Date();
	const hours=String(date.getHours()).padStart(2,"0");
	const minutes=String(date.getMinutes()).padStart(2,"0");
	const logStr=`${hours.split("").join(" ")} : ${minutes.split("").join(" ")}`
	const text=figlet.textSync(logStr);
	const res={
		changed:true,
		text,
	};

	if(data.lastTime==text){
		res.changed=false;
	}else{
		data.lastTime=text;
	}

	return res;
}

const spawnedProcess=spawn("cmatrix",["-u","10"],{
	env:process.env,
});

spawnedProcess.stdout.on("data",buffer=>{
	let text=buffer.toString("utf-8");

	text+=savePos();
	text+=changeCursorPos(1,1);
	text+=getTime().text;
	text+=restorePos();

	process.stdout.write(text);
});
