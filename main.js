const child_process=require("child_process");
const fetch=require("node-fetch");
const fs=require("fs");
const localCommunication=require("local-communication");

const {
	clearScreen,
	getTextEntry,
	getTextLength,
	removeText,
	writeFrame,
	writePixel,
	writeRectangle,
	writeText,
}=require("./lib/framebuffer")({
	bgColor: [0,0,0],
	bytesPerPixel: 4,
	fbPath: "/dev/fb0",
	fontSize: 3,
	newlineOffset: 50,
	screen_height: 600,
	screen_width: 1024,
	...require("./config.json"),
});

const framebuffer = require("./lib/framebuffer");

const weatherAPI="https://api.openweathermap.org/data/2.5/weather?q=$(location)&appid=87cc051aea39f462a77dc06457be6abc&units=metric";
const waitForConnection=true;

function sleep(ms){return new Promise(resolve=>{
	// setTimeout but promise
	setTimeout(resolve,ms);
})}
function makeRequest(url,...args){return new Promise(async(resolve,reject)=>{
	let networkError=false;
	while(true){
		try{
			const header=await fetch(url,...args);
			let response=await header.text();
			try{response=JSON.parse(response)}catch(e){}
			resolve(response);
			break;
		}catch(e){
			if(!waitForConnection){
				networkError=writeText(0,0,5,"/",0,0,255);
				console.log("Network Error: "+e.message);
				writeFrame();
				reject("no network connection!");
				break;
			}
			else{
				//console.log("Wait for network ... "+e.message);
				networkError=writeText(0,0,5,"/",0,0,255);
				writeFrame();
				await sleep(5e3);
			}
		}
	}
	if(networkError){
		removeText(networkError);
		writeFrame();
	}
})}
function getWeather(location){
	const api=weatherAPI.split("$(location)").join(encodeURIComponent(location));
	return makeRequest(api);
}
function getWeatherData(weatherResponse){
	const {
		name,
		cod,
		main:{
			temp,
			humidity,
			temp_min,
			temp_max,
			feels_like,
		},
		wind:{
			speed: wind_speed,
		},
	}=weatherResponse;
	return {
		name,
		temp,
		temp_feelsLike: feels_like,
		temp_min,
		temp_max,
		humidity,
		wind_speed,
		lastRefresh: Date.now(),
		code: cod,
	};
}
function getTimeString(timeMS,relativeTime=false){
	const pad=(num)=>String(num).padStart(2,"0");
	const realDate=new Date();

	const realSeconds=realDate.getSeconds();
	const realMinutes=realDate.getMinutes();
	const realHours=realDate.getHours();
	const realDay=realDate.getDate();
	const realMonth=realDate.getMonth()+1;
	const realYear=realDate.getFullYear();

	const date=new Date((relativeTime?Date.now():timeMS*2)-timeMS);

	const seconds=date.getSeconds();
	const minutes=date.getMinutes();
	const hours=date.getHours();
	const day=date.getDate();
	const month=date.getMonth()+1;
	const year=date.getFullYear();

	if(relativeTime){
		let string=`${seconds} Sekunde${seconds===1?"":"n"}`;
		if(minutes>0) string=`${minutes} Minute${minutes===1?"":"n"}`;
		if(hours>1) string=`${hours-1} Stunde${hours===2?"":"n"}`;
		if(day>1) string=`${day-1} Tag${day===2?"":"en"}`;
		return string;
	}
	else{
		let string=`${pad(hours)}:${pad(minutes)}`;
		if(
			day!==realDay||
			month!==realMonth
		) string+=` ${pad(day)}.${pad(month)}`;

		if(year!==realYear) string+="."+year;
		return string;
	}
}
function getTimeString_(){
	const date=new Date();
	const minutes=String(date.getMinutes()).padStart(2,"0");
	const hours=String(date.getHours()).padStart(2,"0");
	const string=hours+":"+minutes;
	return string;
}
function exit(){
	process.stdin.pause(); // do not wait for input anymore
	clearInterval(updateInterval); // do not run update();
	clearInterval(updateWeatherInterval); // do not refresh the weather
	closeHardwareInput();
}
async function refreshWeather(){
	const response=await getWeather("dohren");
	if(response.cod===429){
		weather={
			code: 429,
			lastRefresh: Date.now(),
		};
	}
	else if(response.cod===200){
		weather=getWeatherData(response);
	}
	else{
		console.clear();
		console.log(response);
		process.exit(1);
	}
}
async function update(){
	for(const id of screenTextIds){
		removeText(id);
	}
	screenTextIds=[];

	const timeText=getTimeString_();
	const timeTextSize=8;
	let clockPos="top";
	if(screen==="clock") clockPos="center";
	if(
		timeText!==lastTimeText||
		screen!==lastScreen

	){
		lastTimeText=timeText;
		if(timeTextId) removeText(timeTextId);
		const [lengthX,lengthY]=getTextLength(timeTextSize,timeText);
		let x=(screen_width-lengthX)/2;
		let y=0;
		if(clockPos==="center"){
			y=(screen_height-lengthY)/2;
		}
		else if(clockPos==="top"){
			y=50;
		}
		timeTextId=writeText(x,y,timeTextSize,timeText,0,255,0);
	}

	if(screen==="clock"&&global.shutdownTime){
		const shutdownMin=Math.round(((global.shutdownTime-Date.now())/1000/60)*100)/100;
		if(global.shutdownTextId) removeText(global.shutdownTextId);
		global.shutdownTextId=writeText(100,Math.round(screen_height/1.5),5,"Shutdown: "+shutdownMin+" Min",0,0,255);
	}
	else if(screen!=="clock"&&lastScreen==="clock"&&global.shutdownTime){
		if(global.shutdownTextId) removeText(global.shutdownTextId);
		global.shutdownTextId=undefined;
	}

	if(global.shutdownTime&&global.shutdownTime<Date.now()){
		global.shutdownTime=undefined;
		clearInterval(updateInterval);
		clearInterval(updateWeatherInterval);
		clearScreen();
		const shutdownText="IS SHUTTING DOWN";
		const s=5;
		const [lengthX,lengthY]=getTextLength(s,shutdownText);
		writeText((screen_width-lengthX)/2,(screen_height-lengthY)/2,s,shutdownText,0,0,255);
		console.clear();
		writeFrame();
		await sleep(1e4);
		console.log("shutdown...");
		child_process.execSync("/sbin/shutdown 0");
		console.log("ok exit!");
		process.exit(0);
	}

	if(screen==="weather"){
		let startY=200;
		if(weather&&weather.code===200){
			const lastRefreshString=getTimeString(weather.lastRefresh,true);
			screenTextIds.push(writeText(100,startY,fontSize,"Position: "+weather.name,0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Temp: "+Math.round(weather.temp)+" C",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Temp~: "+Math.round(weather.temp_feelsLike)+" C",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Temp-Max: "+Math.round(weather.temp_max)+" C",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Temp-Min: "+Math.round(weather.temp_min)+" C",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Luft-feuchte: "+Math.round(weather.humidity)+"%",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Wind-Speed: "+Math.round(weather.wind_speed)+" km/h",0,0,255));
			startY+=newlineOffset;
			screenTextIds.push(writeText(100,startY,fontSize,"Aktualisiert vor "+lastRefreshString,0,0,255));
			startY+=newlineOffset;
		}
		else{
			if(!weather){
				screenTextIds.push(writeText(100,startY,fontSize,"Warte auf Wetter...",0,0,255));
				startY+=stepY;
			}
			else if(weather.code===429){
				const lastRefreshString=getTimeString(weather.lastRefresh,true);
				screenTextIds.push(writeText(100,startY,fontSize,"zu viele anfragen!",0,0,255));
				startY+=stepY;
				screenTextIds.push(writeText(100,startY,fontSize,"Aktualisiert vor "+lastRefreshString,0,0,255));
				startY+=stepY;
			}
		}
	}
	writeFrame();
	lastScreen=screen;
}
function onHardwareInput(eventName,data){
	if(eventName==="power"){
		if(global.shutdownTime&&screen==="clock"){
			global.shutdownTime=undefined;
			if(global.shutdownTextId) removeText(global.shutdownTextId);
			process.stdout.write("\x07");
		}
		else{
			if(screen==="clock") screen="weather";
			else screen="clock";
		}
		update();
	}
}
function onAutoEvent(event,args){
	if(event==="shutdown"){
		global.shutdownTime=Date.now()+Number(args);
	}
}

{	// load "config.json"
	const config=require("./config.json");
	const configKeys=Object.keys(config);

	for(let key of configKeys){
		const value=config[key];
		global[key]=value;
	}
}

let watches=[];
let lastTimeText=undefined;
let timeTextId=undefined;
let lastScreen="clock";
let screen="clock";
let screenTextIds=[];

let weather=0;

process.stdin.setRawMode(true);
process.stdin.on("data",keyBuffer=>{
	const char=keyBuffer.toString("utf-8");
	const byte=keyBuffer[0];

	switch(char){
		case "q":
		case "\u001b": // ESCAPE
		case "\u0003":{// STRG + C
			exit();
			break;
		}
		case "p":{
			onHardwareInput("power",true);
			break;
		}
	}
});
let closeHardwareInput=()=>{};
try{
	if(!fs.existsSync("/tmp/hardwareInput.socket")) throw new Error("socket not found!");
	const hardwareInput=localCommunication("/tmp/hardwareInput.socket");
	hardwareInput.on("*",onHardwareInput);
	closeHardwareInput=hardwareInput.end;
}catch(e){console.log("/tmp/hardwareInput.socket not found!")}

require("./lib/autoService")(onAutoEvent);
clearScreen();
let updateInterval=setInterval(update,1e3); // make frame every second
let updateWeatherInterval=setInterval(refreshWeather,1e3*60*60*3); // refresh all 3 hours
refreshWeather();
update();

// show who user run this program lff or root
//const whoami=child_process.execSync("whoami").toString("utf-8").trim();
//writeText(100,100,5,whoami,0,255,0);
//writeFrame();
