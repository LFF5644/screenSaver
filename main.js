#!/bin/env node
const cursor=require("lff-modules/cursor"); // https://github.com/LFF5644/node-modules
const figlet=require("figlet");
const {spawn}=require("child_process");
const {LINES,COLUMNS}=process.env;
let lastStatus={
	clear: null,
	showColumn: null,
	showLine: null,
	time: null,
};
let message="";

function getTime(){
	const date=new Date();
	const hours=String(date.getHours()).padStart(2,"0");
	const minutes=String(date.getMinutes()).padStart(2,"0");
	const logStr=`${hours.split("").join(" ")} : ${minutes.split("").join(" ")}`
	const text=figlet.textSync(logStr);
	return text;
}
function renderClockClear(data){
	const {
		showColumn,
		showLine,
		time,
	}=data;
	let clear=cursor.changePosition(1,1);
	clear+="\x1b[0m";	// color reset
	clear+="\x1b[37m";	// color to white
	clear+="\x1b[1m";	// color to bright
	clear+=(time
		.split("\n")
		.map(item=>item
			.split("")
			.map(i=>i!==" "?" ":(
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
		.join("\n")
	);
	clear+="\x1b[0m";	// color reset
	return clear;
}
function renderClock(data){
	const {
		showColumn,
		showLine,
		time,
	}=data;
	let text="";
	text+=cursor.changePosition(1,1);
	text+="\x1b[0m";	// color reset
	text+="\x1b[37m";	// color to white
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
		.join("\n")+
		"\n"+
		"\x1b[34m"+
		message
	);
	text+="\x1b[0m";	// color reset
	return text;
}
function writeFrame(buffer=Buffer.from("")){
	let text="";
	text+="\033[u";		// load cursor position
	text+=buffer.toString("utf-8");
	text+="\033[s"; 	// save cursor position

	const time=getTime();
	const showColumn=Math.round((COLUMNS/2)-time.split("\n")[0].length/2);
	const showLine=Math.round((LINES/2)-time.split("\n").length/2);

	if(
		lastStatus.clear&&
		lastStatus.showColumn&&
		lastStatus.showLine&&
		lastStatus.time&&
		(
			lastStatus.time!==time||
			lastStatus.showColumn!==showColumn||
			lastStatus.showLine!==showLine
		)
	){
		text+=lastStatus.clear;
	}
	if(
		lastStatus.time!==time||
		lastStatus.showColumn!==showColumn||
		lastStatus.showLine!==showLine
	){
		lastStatus={
			clear: renderClockClear({
				showColumn,
				showLine,
				time,
			}),
			showColumn,
			showLine,
			time,
		};
	}

	text+=renderClock({
		showColumn,
		showLine,
		time,
	});

	process.stdout.write(text);
}

const spawnedProcess=spawn("cmatrix",["-u","10"]);
spawnedProcess.stdout.on("data",writeFrame);

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
