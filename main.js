const fs=require("fs");
const {
	writeFrame,
	writePixel,
	writeRectangle,
	writeText,
	removeText,
	getTextLength,
	clearScreen,
}=require("./lib/framebuffer")({
	screen_height: 600,
	screen_width: 1024,
	bytesPerPixel: 4,
	fbPath: "/dev/fb0",
	bgColor: [0,0,0],
	...require("./config.json"),
});

function getTimeString(){
	const date=new Date();
	const minutes=String(date.getMinutes()).padStart(2,"0");
	const hours=String(date.getHours()).padStart(2,"0");
	const string=hours+":"+minutes;
	return string;
}
function exit(){
	process.stdin.pause(); // do not wait for input anymore
	clearTimeout(updateInterval); // do not run update();
}

function update(){
	const timeText=getTimeString();
	const timeTextSize=8;
	if(timeText!==lastTimeText){
		lastTimeText=timeText;
		if(timeTextId) removeText(timeTextId);
		const [lengthX,lengthY]=getTextLength(timeTextSize,timeText);
		let x=(screen_width-lengthX)/2;
		let y=(screen_height-lengthY)/2;
		timeTextId=writeText(x,y,timeTextSize,timeText,0,255,0);
	}
	writeFrame();
}

{ // load "config.json"
	const config=require("./config.json");
	const configKeys=Object.keys(config);

	for(let key of configKeys){
		const value=config[key];
		global[key]=value;
	}
}

let lastTimeText=undefined;
let timeTextId=undefined;

process.stdin.setRawMode(true);
process.stdin.on("data",keyBuffer=>{
	const char=keyBuffer.toString("utf-8");
	const byte=keyBuffer[0];
	console.log(JSON.stringify(char),keyBuffer);

	switch(char){
		case "q":
		case "\u001b": // ESCAPE
		case "\u0003":{// STRG + C
			exit();
			break;
		}
	}
});

clearScreen();
let updateInterval=setInterval(update,1e3);
update();
