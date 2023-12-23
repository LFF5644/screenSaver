const child_process=require("child_process");

let isShuttingDown=false;

function update(){
	const date=new Date();
	const hours=date.getHours();
	const minutes=date.getMinutes();
	console.log("update")

	if(hours===23&&minutes==55&&isShuttingDown===false){
		console.log("WARNING IT IS 0 O'COCK! SERVER IS SHUTING DOWN IN 3 MINUTES!");
		isShuttingDown=true;
		eventTarget("shutdown",6e4*3); // 3 Min
	}

}

module.exports=fn=>{
	global.eventTarget=fn;
	const interval=setInterval(update,1e5);
	update();
	return ()=>clearInterval(interval);
};