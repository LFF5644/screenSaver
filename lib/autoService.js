const child_process=require("child_process");
const os=require("os");
const fs=require("fs");

let isShuttingDown=false;

function getDateString(){
	return child_process.execSync("date"+(os.platform()==="win32"?" /t":"")).toString("utf-8").trim();
}

function update(){
	const date=new Date();
	const hours=date.getHours();
	const minutes=date.getMinutes();
	//console.log("update");

	if(hours===23&&minutes==54&&isShuttingDown===false){
		console.log("WARNING IT IS 0 O'COCK! SERVER IS SHUTING DOWN IN 3 MINUTES!");
		isShuttingDown=true;
		fs.appendFileSync("shutdown.log",getDateString()+"\n");
		eventTarget("shutdown",3*60*1e3); // 3 Min
	}

}

module.exports=fn=>{
	global.eventTarget=fn;
	const interval=setInterval(update,1e4);
	update();
	return ()=>clearInterval(interval);
};
