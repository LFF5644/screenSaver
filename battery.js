console.log("load...");
const fs=require("fs");
const fb=require("./lib/framebuffer")({
	bgColor: [0,0,0],
	fbPath: "/dev/fb0",
	fontSize: 3,
	newlineOffset: 50,
	...require("./config.json"),
});

function wait(time){return new Promise(resolve=>{
	setTimeout(resolve,time);
})}

function getBatteryInfos(){
	const capacity=Number(fs.readFileSync(batteryPath+"/capacity"));
	const status=fs.readFileSync(batteryPath+"/status").toString("utf-8").trim();

	return {capacity,status};
}
function updateText(){
	const offsetY=65;
	if(textId) fb.removeText(textId);
	const text=`${battery.status} at ${battery.capacity}%`;
	const [textLengthX,textLengthY]=fb.getTextLength(2,text);
	const textX=Math.round(screen_width/2-textLengthX/2);
	const textY=Math.round(screen_height/2-offsetY-textLengthY);
	const textColor=(
		battery.status==="Charging"?[0,255,0]:[255,0,0]
	)
	textId=fb.writeText(textX,textY,2,text,...textColor);
}

const batteryPath=(()=>{
	const batterys=[
		"/sys/class/power_supply/BAT0",
		"/sys/class/power_supply/BAT1",
	];
	for(const battery of batterys){
		if(fs.existsSync(battery)) return battery;
	}
	return null;
})();

if(!batteryPath){
	console.log("no battery found!");
	process.exit();
}
else console.log("using battery "+batteryPath);

fb.clearScreen(...bgColor);

let battery=getBatteryInfos();

let pId=0;
let textId=0;
let init=false;
{
	const barWidth=500;
	const barHeight=100;
	const barX=Math.round(screen_width/2-barWidth/2);
	const barY=Math.round(screen_height/2-barHeight/2);
	pId=fb.createProgressbar(barX,barY,barWidth,barHeight,{
		border:{
			color: [0,255,0],
			size: 5,
		},
		progress:{
			color: [255,0,0],
			value: 10,
		},
		text:{
			color: [0,255,0],
			content: "Batterie...",
			size: 2,
			onUpdate: progress=> `${battery.status==="Discharging"?"":"~"}${battery.capacity}%`,
		},
	});

	const rectLeftWidth=20;
	const rectLeftHeight=50;
	const rectLeftX=barX-rectLeftWidth;
	const rectLeftY=barY+Math.round(rectLeftHeight/2);
	fb.writeRectangle(rectLeftX,rectLeftY,rectLeftWidth,rectLeftHeight,0,255,0);

	const rectRightWidth=5;
	const rectRightHeight=80;
	const rectRightX=Math.round(barX+barWidth);
	const rectRightY=barY+10
	fb.writeRectangle(rectRightX,rectRightY,rectRightWidth,rectRightHeight,0,255,0);

}

(async()=>{
	while(true){
		const oldState=battery.status+"_"+battery.capacity+"%";
		battery=getBatteryInfos();
		const newState=battery.status+"_"+battery.capacity+"%";

		if(oldState!==newState||!init){
			updateText();
			fb.changeProgress(pId,battery.capacity);
		}
		if(!init) init=true;
		await fb.writeFrame();
		await wait(1e3);
	}
})();


